import { addProtocol } from "maplibre-gl"
import type { StyleSpecification } from "maplibre-gl"

// The basemap of Auspice's map: Natural Earth 5.1.2 country outlines, land borders and country
// names (public domain), drawn with the colors of Auspice's default map style
// (`src/util/map-styles.json`). The files ship with the extension (`assets/basemap/`, built by
// `scripts/build-basemap.ts`), so the map contacts no server. They load through the `basemap://`
// protocol only when a map is shown, so the client bundle, which every viewer loads, stays small.

/** Attribution of the map data, which the map and the caption of the SVG export show */
export const BASEMAP_ATTRIBUTION =
  '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 5.1.2'

/** The style of the basemap, for MapLibre, which Auspice's map draws below its demes */
export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "basemap://fonts/{fontstack}/{range}.pbf",
  sources: {
    countries: { type: "geojson", data: "basemap://countries.json" },
    borders: { type: "geojson", data: "basemap://borders.json" },
    labels: { type: "geojson", data: "basemap://labels.json" },
  },
  layers: [
    { id: "water", type: "background", paint: { "background-color": "hsl(185, 9%, 81%)" } },
    {
      id: "land",
      type: "fill",
      source: "countries",
      paint: { "fill-color": "hsl(55, 11%, 96%)", "fill-antialias": true },
    },
    {
      id: "boundary_2",
      type: "line",
      source: "borders",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "hsl(0,0%,70%)",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 4, 1],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 5, 1.8, 12, 3],
      },
    },
    // Country names in three ranks of prominence; the names of the third rank show from zoom 2
    countryLabels({ rank: 3, minzoom: 2, sizes: [3, 9, 7, 17] }),
    countryLabels({ rank: 2, sizes: [2, 9, 5, 17] }),
    countryLabels({ rank: 1, sizes: [1, 9, 4, 17] }),
  ],
}

/**
 * Let MapLibre load `basemap://<path>` from the basemap directory of the webview, whose address the
 * page gives in `data-basemap-base`. MapLibre's workers hand a protocol they do not know to the
 * main thread, whose requests for webview resources VS Code serves from the extension.
 */
export function registerBasemapProtocol(): void {
  addProtocol("basemap", async (params, abortController) => {
    const response = await fetch(basemapFileUrl(params.url), { signal: abortController.signal })
    if (!response.ok) throw new Error(`${params.url}: HTTP ${response.status}`)
    const data: unknown =
      params.type === "json" ? await response.json() : await response.arrayBuffer()
    return { data }
  })
}

/**
 * Return the address of a basemap file. MapLibre writes the font name into the glyph path, which
 * may come encoded or not, so each part of the path is decoded and encoded again.
 */
export function basemapFileUrl(url: string): string {
  const base = document.getElementById("root")?.dataset["basemapBase"]
  if (base === undefined) throw new Error("The page gives no address of the basemap files.")
  const path = url
    .slice("basemap://".length)
    .split("/")
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/")
  return `${base}/${path}`
}

function countryLabels({
  rank,
  minzoom,
  sizes,
}: {
  readonly rank: number
  readonly minzoom?: number
  readonly sizes: readonly number[]
}): StyleSpecification["layers"][number] {
  return {
    id: `label_country_${rank}`,
    type: "symbol",
    source: "labels",
    ...(minzoom === undefined ? {} : { minzoom }),
    maxzoom: 9,
    filter: ["==", ["get", "rank"], rank],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Bold"],
      "text-max-width": 6.25,
      "text-size": ["interpolate", ["linear"], ["zoom"], ...sizes],
    },
    paint: {
      "text-color": "#6b6b6b",
      "text-halo-blur": 1,
      "text-halo-color": "#fff",
      "text-halo-width": 1,
    },
  }
}
