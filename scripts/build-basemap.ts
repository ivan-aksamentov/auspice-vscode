import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { z } from "zod"

import { runOutput } from "./process.js"

// Build the basemap of the viewer's map: country outlines, land borders and country names of
// Natural Earth 5.1.2 (public domain), and the glyphs of the Noto Sans font that MapLibre draws the
// names with (openmaptiles/fonts v2.0, SIL Open Font License). The extension ships the files, so
// the map contacts no server. Each download is checked against its SHA-256 below; the Natural Earth
// files and the font license match the blobs of their release tags on GitHub.

const NATURAL_EARTH = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2"
const SOURCES = {
  countries: {
    url: `${NATURAL_EARTH}/geojson/ne_50m_admin_0_countries.geojson`,
    sha256: "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
  },
  borders: {
    url: `${NATURAL_EARTH}/geojson/ne_50m_admin_0_boundary_lines_land.geojson`,
    sha256: "2faac4f6b34386f3d21b6e018cf151f241f00e5c936d44dd17d7d9bfb147fa48",
  },
  fonts: {
    url: "https://github.com/openmaptiles/fonts/releases/download/v2.0/noto-sans.zip",
    sha256: "d117316544b43a5dde7ee761b36e17701e9f85574e181d76a74814240fdbaf34",
  },
  fontLicense: {
    url: "https://raw.githubusercontent.com/openmaptiles/fonts/v2.0/noto-sans/LICENSE",
    sha256: "6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2",
  },
} as const

/** The glyphs of the label font for U+0000-U+00FF, which hold every character of the names */
const GLYPHS = "Noto Sans Bold/0-255.pbf"

/** Decimal places of the coordinates: 0.01 degree is about 1 km, finer than the 1:50m data */
const COORDINATE_DECIMALS = 2

const extensionRoot = resolve(import.meta.dirname, "..")
const basemapRoot = resolve(extensionRoot, "assets", "basemap")

const positionSchema = z.array(z.number()).min(2)
const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LineString"), coordinates: z.array(positionSchema) }),
  z.object({ type: z.literal("MultiLineString"), coordinates: z.array(z.array(positionSchema)) }),
  z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(positionSchema)) }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.array(positionSchema))),
  }),
])
const countriesSchema = z.object({
  features: z.array(
    z.object({
      properties: z.looseObject({
        NAME: z.string(),
        LABEL_X: z.number(),
        LABEL_Y: z.number(),
        LABELRANK: z.number().int(),
      }),
      geometry: geometrySchema,
    }),
  ),
})
const bordersSchema = z.object({ features: z.array(z.object({ geometry: geometrySchema })) })

export async function buildBasemap(): Promise<void> {
  const [countries, borders, fontLicense] = await Promise.all([
    download(SOURCES.countries),
    download(SOURCES.borders),
    download(SOURCES.fontLicense),
  ])
  const naturalEarth = {
    countries: countriesSchema.parse(JSON.parse(new TextDecoder().decode(countries))),
    borders: bordersSchema.parse(JSON.parse(new TextDecoder().decode(borders))),
  }
  await writeOutput(
    join(basemapRoot, "countries.json"),
    JSON.stringify(countryOutlines(naturalEarth.countries.features)),
  )
  await writeOutput(
    join(basemapRoot, "borders.json"),
    JSON.stringify(landBorders(naturalEarth.borders.features)),
  )
  await writeOutput(
    join(basemapRoot, "labels.json"),
    JSON.stringify(countryLabels(naturalEarth.countries.features)),
  )
  await writeOutput(join(basemapRoot, "fonts", GLYPHS), await fontGlyphs())
  await writeOutput(
    resolve(extensionRoot, "assets", "licenses", "NOTO-SANS-LICENSE.txt"),
    fontLicense,
  )
}

/** Return the country outlines, each with its name */
export function countryOutlines(features: readonly CountryFeature[]): FeatureCollection {
  return featureCollection(
    features.flatMap(({ properties, geometry }) => {
      const rounded = roundGeometry(geometry)
      return rounded === undefined ? [] : [feature({ name: properties.NAME }, rounded)]
    }),
  )
}

/** Return the borders between countries on land, so that coasts get no border line */
export function landBorders(features: readonly BorderFeature[]): FeatureCollection {
  return featureCollection(
    features.flatMap(({ geometry }) => {
      const rounded = roundGeometry(geometry)
      return rounded === undefined ? [] : [feature({}, rounded)]
    }),
  )
}

/**
 * Return a label point for each country, at Natural Earth's label position, with its name and its
 * rank: 1 for the countries that Natural Earth labels first (`LABELRANK` up to 2), 2 for rank 3,
 * and 3 for the rest. The map style shows the ranks from different zoom levels.
 */
export function countryLabels(features: readonly CountryFeature[]): FeatureCollection {
  return featureCollection(
    features.map(({ properties }) =>
      feature(
        { name: properties.NAME, rank: labelRank(properties.LABELRANK) },
        { type: "Point", coordinates: roundPosition([properties.LABEL_X, properties.LABEL_Y]) },
      ),
    ),
  )
}

/**
 * Return the geometry with rounded coordinates. Rounding can merge neighboring positions, which are
 * then kept once; a line or ring with too few positions left is dropped, and so is a geometry
 * without any.
 */
export function roundGeometry(geometry: Geometry): Geometry | undefined {
  switch (geometry.type) {
    case "LineString": {
      const line = roundLine(geometry.coordinates)
      return line === undefined ? undefined : { type: "LineString", coordinates: line }
    }
    case "MultiLineString": {
      const lines = geometry.coordinates.map(roundLine).filter((line) => line !== undefined)
      return lines.length === 0 ? undefined : { type: "MultiLineString", coordinates: lines }
    }
    case "Polygon": {
      const polygon = roundPolygon(geometry.coordinates)
      return polygon === undefined ? undefined : { type: "Polygon", coordinates: polygon }
    }
    case "MultiPolygon": {
      const polygons = geometry.coordinates
        .map(roundPolygon)
        .filter((polygon) => polygon !== undefined)
      return polygons.length === 0 ? undefined : { type: "MultiPolygon", coordinates: polygons }
    }
    default:
      return assertNever(geometry)
  }
}

export type Position = readonly number[]

export type Geometry =
  | { readonly type: "LineString"; readonly coordinates: readonly Position[] }
  | { readonly type: "MultiLineString"; readonly coordinates: readonly (readonly Position[])[] }
  | { readonly type: "Polygon"; readonly coordinates: readonly (readonly Position[])[] }
  | {
      readonly type: "MultiPolygon"
      readonly coordinates: readonly (readonly (readonly Position[])[])[]
    }

export interface CountryFeature {
  readonly properties: {
    readonly NAME: string
    readonly LABEL_X: number
    readonly LABEL_Y: number
    readonly LABELRANK: number
  }
  readonly geometry: Geometry
}

export interface BorderFeature {
  readonly geometry: Geometry
}

export interface FeatureCollection {
  readonly type: "FeatureCollection"
  readonly features: readonly Feature[]
}

interface Feature {
  readonly type: "Feature"
  readonly properties: Readonly<Record<string, string | number>>
  readonly geometry: Geometry | { readonly type: "Point"; readonly coordinates: Position }
}

async function download(source: Source): Promise<Uint8Array> {
  const response = await fetch(source.url)
  if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  if (sha256 !== source.sha256) {
    throw new Error(`${source.url}: SHA-256 is ${sha256}, expected ${source.sha256}`)
  }
  return bytes
}

/** Return the glyph file of the label font from the font archive */
async function fontGlyphs(): Promise<Uint8Array> {
  const archive = await download(SOURCES.fonts)
  const directory = await mkdtemp(join(tmpdir(), "auspice-vscode-fonts-"))
  try {
    const archivePath = join(directory, "noto-sans.zip")
    await writeFile(archivePath, archive)
    return runOutput("unzip", ["-p", archivePath, GLYPHS])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function writeOutput(path: string, content: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

function featureCollection(features: readonly Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features }
}

function feature(properties: Feature["properties"], geometry: Feature["geometry"]): Feature {
  return { type: "Feature", properties, geometry }
}

function labelRank(naturalEarthRank: number): number {
  if (naturalEarthRank <= 2) return 1
  if (naturalEarthRank === 3) return 2
  return 3
}

/** Return the line with rounded positions, or nothing when fewer than 2 positions are left */
function roundLine(line: readonly Position[]): Position[] | undefined {
  const rounded = withoutRepeats(line.map(roundPosition))
  return rounded.length < 2 ? undefined : rounded
}

/**
 * Return the polygon with rounded rings. A ring needs 4 positions, the last equal to the first; a
 * polygon whose outer ring has fewer is dropped, and so is a hole with fewer.
 */
function roundPolygon(rings: readonly (readonly Position[])[]): Position[][] | undefined {
  const rounded = rings.map((ring) => withoutRepeats(ring.map(roundPosition)))
  const [outer, ...holes] = rounded
  if (outer === undefined || outer.length < 4) return undefined
  return [outer, ...holes.filter((hole) => hole.length >= 4)]
}

function roundPosition(position: Position): Position {
  const factor = 10 ** COORDINATE_DECIMALS
  return position.slice(0, 2).map((value) => Math.round(value * factor) / factor)
}

function withoutRepeats(positions: readonly Position[]): Position[] {
  return positions.filter(
    (position, index) => index === 0 || !samePosition(position, positions[index - 1]),
  )
}

function samePosition(first: Position, second: Position | undefined): boolean {
  return second !== undefined && first[0] === second[0] && first[1] === second[1]
}

function assertNever(value: never): never {
  throw new Error(`Unhandled geometry: ${JSON.stringify(value)}`)
}

interface Source {
  readonly url: string
  readonly sha256: string
}

if (import.meta.main) await buildBasemap()
