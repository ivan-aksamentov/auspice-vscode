import { basename, dirname } from "node:path"

import type { TextDocument } from "vscode"
import { Uri, workspace } from "vscode"

import type { ViewerResource } from "./protocol.js"

const UTF8_ENCODER = new TextEncoder()
const DEFAULT_RESOURCE_LIMIT_MIB = 256
const MAX_RESOURCE_LIMIT_MIB = 1_024
const TEXT_SUFFIXES = [".json", ".auspicejson", ".new", ".nwk", ".newick", ".csv", ".tsv", ".md"]
const DATASET_SUFFIXES = [".auspice.json", ".auspicejson", ".json", ".new", ".nwk", ".newick"]
const SIDECAR_SUFFIXES = ["_tip-frequencies.json", "_measurements.json", "_root-sequence.json"]
const NARRATIVE_DATASET_SUFFIXES = [
  ".auspice.json",
  ".auspicejson",
  ".json",
  ".new",
  ".nwk",
  ".newick",
]

export async function resolveDatasetUris(primary: Uri): Promise<readonly Uri[]> {
  const configuration = workspace.getConfiguration("auspiceVscode", primary)
  if (configuration.get<unknown>("companionDiscovery") === false) return [primary]
  const effectiveName = basename(primary.path).replace(/\.(?:gz|gzip)$/iu, "")
  const directory = primary.with({ path: dirname(primary.path) })
  const directoryEntries = await workspace.fs.readDirectory(directory)
  const entries = new Set(directoryEntries.map(([name]) => name))
  const companions = companionNames(effectiveName).flatMap((name) => {
    const matches = [name, `${name}.gz`, `${name}.gzip`].filter((candidate) =>
      entries.has(candidate),
    )
    if (matches.length > 1) {
      throw new Error(`Companion ${name} is ambiguous: ${matches.join(", ")}.`)
    }
    const match = matches.at(0)
    return match === undefined ? [] : [Uri.joinPath(directory, match)]
  })
  return [primary, ...companions]
}

export async function resolveNarrativeDatasetUris(
  narrative: Uri,
  datasetNames: readonly string[],
): Promise<NarrativeDatasetResolution> {
  const directory = narrative.with({ path: dirname(narrative.path) })
  const directoryEntries = await workspace.fs.readDirectory(directory)
  const entries = new Set(directoryEntries.map(([name]) => name))
  const matches = datasetNames.map((datasetName) => {
    const prefix = datasetName.replaceAll(/^\/+|\/+$/gu, "").replaceAll("/", "_")
    const matchingNames = NARRATIVE_DATASET_SUFFIXES.flatMap((suffix) =>
      [`${prefix}${suffix}`, `${prefix}${suffix}.gz`].filter((name) => entries.has(name)),
    )
    if (matchingNames.length === 0) {
      return { datasetName }
    }
    if (matchingNames.length > 1) {
      throw new Error(
        `Narrative dataset ${datasetName} matches more than one sibling tree file: ${matchingNames.join(", ")}.`,
      )
    }
    const matchingName = matchingNames.at(0)
    return matchingName === undefined
      ? { datasetName }
      : { datasetName, uri: Uri.joinPath(directory, matchingName) }
  })
  const primaries = matches.flatMap((match) => (match.uri === undefined ? [] : [match.uri]))
  const groups = await Promise.all(primaries.map(resolveDatasetUris))
  return {
    uris: Array.from(new Map(groups.flat().map((uri) => [uri.toString(), uri])).values()),
    missingNames: matches.flatMap((match) => (match.uri === undefined ? [match.datasetName] : [])),
  }
}

export interface NarrativeDatasetResolution {
  readonly uris: readonly Uri[]
  readonly missingNames: readonly string[]
}

export async function readResource(uri: Uri, limitBytes: number): Promise<ViewerResource> {
  const stat = await workspace.fs.stat(uri)
  if (stat.size > limitBytes) {
    throw new Error(
      `${basename(uri.path)} uses ${formatBytes(stat.size)}, above the ${formatBytes(limitBytes)} limit.`,
    )
  }
  const openDocument = workspace.textDocuments.find(
    (document) => document.uri.toString() === uri.toString(),
  )
  const bytes =
    openDocument !== undefined && isTextResource(uri)
      ? readTextDocument(openDocument)
      : await readFileBytes(uri)
  if (bytes.byteLength > limitBytes) {
    throw new Error(
      `${basename(uri.path)} uses ${formatBytes(bytes.byteLength)}, above the ${formatBytes(limitBytes)} limit.`,
    )
  }
  return { uri: uri.toString(), name: basename(uri.path), bytes }
}

export function resourceLimitBytes(uri?: Uri): number {
  const configured = workspace
    .getConfiguration("auspiceVscode", uri)
    .get<unknown>("resourceLimitMiB")
  const mebibytes =
    typeof configured === "number" &&
    Number.isSafeInteger(configured) &&
    configured >= 1 &&
    configured <= MAX_RESOURCE_LIMIT_MIB
      ? configured
      : DEFAULT_RESOURCE_LIMIT_MIB
  return mebibytes * 1_024 * 1_024
}

function companionNames(name: string): readonly string[] {
  const lower = name.toLowerCase()
  if (lower.endsWith("_meta.json")) {
    return [`${name.slice(0, -"_meta.json".length)}_tree.json`]
  }
  if (lower.endsWith("_tree.json")) {
    return [`${name.slice(0, -"_tree.json".length)}_meta.json`]
  }
  const suffix = DATASET_SUFFIXES.find((candidate) => lower.endsWith(candidate))
  if (suffix === undefined) return []
  const prefix = name.slice(0, -suffix.length)
  return SIDECAR_SUFFIXES.map((sidecarSuffix) => `${prefix}${sidecarSuffix}`)
}

async function readFileBytes(uri: Uri): Promise<ArrayBuffer> {
  const bytes = await workspace.fs.readFile(uri)
  return bytes.slice().buffer
}

function readTextDocument(document: TextDocument): ArrayBuffer {
  return UTF8_ENCODER.encode(document.getText()).buffer
}

function formatBytes(bytes: number): string {
  const mebibytes = bytes / (1_024 * 1_024)
  return `${mebibytes.toFixed(1)} MiB`
}

function isTextResource(uri: Uri): boolean {
  const lower = uri.path.toLowerCase()
  return TEXT_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}
