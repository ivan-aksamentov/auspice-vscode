import { convertFromV1 } from "auspice/cli/server/convertJsonSchemas.js"
import { z } from "zod"

import { newickToAuspiceJson } from "./newick"

const recordSchema = z.record(z.string(), z.unknown())
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true })
const JSON_SUFFIXES = [".auspice.json", ".auspicejson", ".json"]
const NEWICK_SUFFIXES = [".new", ".nwk", ".newick"]
const V1_META_SUFFIX = "_meta.json"
const V1_TREE_SUFFIX = "_tree.json"
const SIDECAR_SUFFIXES = {
  tipFrequencies: "_tip-frequencies.json",
  measurements: "_measurements.json",
  rootSequence: "_root-sequence.json",
} satisfies Record<SidecarKind, string>
const EXPANDED_LIMIT_MESSAGE = "Expanded input data exceeds the configured session size limit."

export async function parseViewerResources(
  resources: readonly RawResource[],
  limitBytes: number,
): Promise<ParsedInputs> {
  const decoded = await decodeResources(resources, limitBytes)
  const classified = await Promise.all(decoded.map(classifyResource))
  const diagnostics = classified.flatMap((resource) => resource.diagnostics)
  const v1Meta = classified.find((resource) => resource.v1?.kind === "meta")?.v1
  const v1Tree = classified.find((resource) => resource.v1?.kind === "tree")?.v1
  const v1Main = convertV1(v1Meta, v1Tree, diagnostics)
  const narrative = classified.find((resource) => resource.narrative !== undefined)?.narrative
  const mains = [
    ...classified.flatMap((resource) => (resource.main === undefined ? [] : [resource.main])),
    ...(v1Main === undefined ? [] : [v1Main]),
  ]
  const sidecars = classified.flatMap((resource) =>
    resource.sidecar === undefined ? [] : [resource.sidecar],
  )
  sidecars
    .filter((sidecar) => !mains.some((main) => main.datasetName === sidecar.datasetName))
    .forEach((sidecar) => {
      diagnostics.push({
        resourceIndex: sidecar.resourceIndex,
        severity: "error",
        message: `Sidecar ${sidecar.datasetName} must be opened through its matching primary dataset.`,
      })
    })
  return {
    mains,
    sidecars,
    ...(narrative === undefined ? {} : { narrative }),
    diagnostics,
  }
}

export interface RawResource {
  readonly uri: string
  readonly name: string
  readonly bytes: Uint8Array
}

export interface ParsedInputs {
  readonly mains: readonly MainInput[]
  readonly sidecars: readonly SidecarInput[]
  readonly narrative?: NarrativeInput
  readonly diagnostics: readonly ViewerDiagnostic[]
}

export interface MainInput {
  readonly datasetName: string
  readonly json: Record<string, unknown>
  readonly resourceIndex: number
}

export type SidecarKind = "tipFrequencies" | "measurements" | "rootSequence"

export interface SidecarInput {
  readonly kind: SidecarKind
  readonly datasetName: string
  readonly json: Record<string, unknown>
  readonly resourceIndex: number
}

export interface NarrativeInput {
  readonly blocks: readonly Record<string, unknown>[]
  readonly datasetNames: readonly string[]
  readonly initialDatasetNames: readonly string[]
  readonly resourceIndex: number
}

export interface ViewerDiagnostic {
  readonly resourceIndex: number
  readonly severity: "error" | "warning" | "information"
  readonly message: string
}

interface DecodedResource extends RawResource {
  readonly resourceIndex: number
  readonly effectiveName: string
}

interface ClassifiedResource {
  readonly main?: MainInput
  readonly sidecar?: SidecarInput
  readonly v1?: V1Input
  readonly narrative?: NarrativeInput
  readonly diagnostics: readonly ViewerDiagnostic[]
}

interface V1Input {
  readonly kind: "meta" | "tree"
  readonly datasetName: string
  readonly json: Record<string, unknown>
  readonly resourceIndex: number
}

async function decodeResource(
  resource: RawResource,
  resourceIndex: number,
  limitBytes: number,
): Promise<DecodedResource> {
  const compressed =
    resource.name.toLowerCase().endsWith(".gz") || resource.name.toLowerCase().endsWith(".gzip")
  if (!compressed && resource.bytes.byteLength > limitBytes) throw new Error(EXPANDED_LIMIT_MESSAGE)
  const bytes = compressed ? await decompress(resource.bytes, limitBytes) : resource.bytes
  const effectiveName = compressed ? resource.name.replace(/\.(?:gz|gzip)$/iu, "") : resource.name
  return { ...resource, resourceIndex, effectiveName, bytes }
}

async function decodeResources(
  resources: readonly RawResource[],
  limitBytes: number,
): Promise<readonly DecodedResource[]> {
  const decoded: DecodedResource[] = []
  let remainingBytes = limitBytes
  for (const [resourceIndex, resource] of resources.entries()) {
    const value = await decodeResource(resource, resourceIndex, remainingBytes)
    decoded.push(value)
    remainingBytes -= value.bytes.byteLength
  }
  return decoded
}

async function classifyResource(resource: DecodedResource): Promise<ClassifiedResource> {
  const lower = resource.effectiveName.toLowerCase()
  try {
    if (lower.endsWith(".md")) return await classifyNarrative(resource)
    if (NEWICK_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return classifyNewick(resource)
    if (JSON_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return classifyJson(resource)
    // The extension is unrecognized, so fall back to sniffing the content.
    return classifyByContent(resource)
  } catch (error: unknown) {
    return {
      diagnostics: [
        {
          resourceIndex: resource.resourceIndex,
          severity: "error",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
}

function classifyNewick(resource: DecodedResource): ClassifiedResource {
  return {
    main: {
      datasetName: stripSuffix(resource.effectiveName, NEWICK_SUFFIXES).replaceAll("_", "/"),
      json: newickToAuspiceJson(resource.effectiveName, decodeText(resource)),
      resourceIndex: resource.resourceIndex,
    },
    diagnostics: [],
  }
}

// The extension gave no reliable hint, so try each parser in turn. The leading
// character picks the likelier one first, but both are attempted before giving
// up so a mislabeled tree or dataset still opens.
function classifyByContent(resource: DecodedResource): ClassifiedResource {
  const looksJson = /^[[{]/u.test(decodeText(resource).trimStart())
  const attempts = looksJson
    ? [tryClassifyJson, tryClassifyNewick]
    : [tryClassifyNewick, tryClassifyJson]
  for (const attempt of attempts) {
    const classified = attempt(resource)
    if (classified !== undefined) return classified
  }
  return unknownResource(resource)
}

function tryClassifyJson(resource: DecodedResource): ClassifiedResource | undefined {
  let parsed: Record<string, unknown>
  try {
    parsed = recordSchema.parse(JSON.parse(decodeText(resource)))
  } catch {
    return undefined
  }
  return recognizeJson(parsed, resource)
}

function tryClassifyNewick(resource: DecodedResource): ClassifiedResource | undefined {
  try {
    return classifyNewick(resource)
  } catch {
    return undefined
  }
}

async function classifyNarrative(resource: DecodedResource): Promise<ClassifiedResource> {
  const [
    { addEndOfNarrativeBlock, getDatasetNamesFromUrl },
    { parseMarkdownNarrativeFile },
    { parseMarkdown },
  ] = await Promise.all([
    import("@auspice/actions/loadData"),
    import("@auspice/util/parseNarrative"),
    import("@auspice/util/parseMarkdown"),
  ])
  const blocks = parseMarkdownNarrativeFile(decodeText(resource), parseMarkdown)
  addEndOfNarrativeBlock(blocks)
  const datasetNames = Array.from(
    new Set(
      blocks.flatMap((block) =>
        typeof block["dataset"] === "string"
          ? getDatasetNamesFromUrl(block["dataset"]).filter(
              (name): name is string => name !== undefined,
            )
          : [],
      ),
    ),
  )
  const firstDataset = blocks.at(0)?.["dataset"]
  const initialDatasetNames =
    typeof firstDataset === "string"
      ? getDatasetNamesFromUrl(firstDataset).filter((name): name is string => name !== undefined)
      : []
  return {
    narrative: { blocks, datasetNames, initialDatasetNames, resourceIndex: resource.resourceIndex },
    diagnostics: [],
  }
}

function classifyJson(resource: DecodedResource): ClassifiedResource {
  const parsed = recordSchema.parse(JSON.parse(decodeText(resource)))
  const recognized = recognizeJson(parsed, resource)
  if (recognized !== undefined) return recognized
  return {
    diagnostics: [
      {
        resourceIndex: resource.resourceIndex,
        severity: "error",
        message:
          "The JSON has no top-level meta and tree fields, so it is not an Auspice v2 dataset.",
      },
    ],
  }
}

// Classify parsed JSON by shape and name. Sidecars and legacy v1 halves depend
// on the `_suffix` naming convention that also pairs them to their dataset, so
// they only match by name; an Auspice v2 dataset is recognized structurally by
// its top-level `meta` and `tree`. Returns undefined when nothing matches, so
// content sniffing can move on to the next parser.
function recognizeJson(
  parsed: Record<string, unknown>,
  resource: DecodedResource,
): ClassifiedResource | undefined {
  const lower = resource.effectiveName.toLowerCase()
  const sidecarKind = Object.entries(SIDECAR_SUFFIXES).find(([, suffix]) =>
    lower.endsWith(suffix),
  )?.[0]
  if (isSidecarKind(sidecarKind)) {
    const suffix = SIDECAR_SUFFIXES[sidecarKind]
    return {
      sidecar: {
        kind: sidecarKind,
        datasetName: resource.effectiveName.slice(0, -suffix.length).replaceAll("_", "/"),
        json: parsed,
        resourceIndex: resource.resourceIndex,
      },
      diagnostics: [],
    }
  }
  if (lower.endsWith(V1_META_SUFFIX) || lower.endsWith(V1_TREE_SUFFIX)) {
    const kind = lower.endsWith(V1_META_SUFFIX) ? "meta" : "tree"
    const suffix = kind === "meta" ? V1_META_SUFFIX : V1_TREE_SUFFIX
    return {
      v1: {
        kind,
        datasetName: resource.effectiveName.slice(0, -suffix.length).replaceAll("_", "/"),
        json: parsed,
        resourceIndex: resource.resourceIndex,
      },
      diagnostics: [],
    }
  }
  if (Object.hasOwn(parsed, "meta") && Object.hasOwn(parsed, "tree")) {
    return {
      main: {
        datasetName: stripSuffix(resource.effectiveName, JSON_SUFFIXES).replaceAll("_", "/"),
        json: parsed,
        resourceIndex: resource.resourceIndex,
      },
      diagnostics: [],
    }
  }
  return undefined
}

function convertV1(
  meta: V1Input | undefined,
  tree: V1Input | undefined,
  diagnostics: ViewerDiagnostic[],
): MainInput | undefined {
  const available = meta ?? tree
  if (available === undefined) return undefined
  if (meta === undefined || tree === undefined) {
    diagnostics.push({
      resourceIndex: available.resourceIndex,
      severity: "error",
      message: `Legacy Auspice v1 data requires both ${available.datasetName}_meta.json and ${available.datasetName}_tree.json.`,
    })
    return undefined
  }
  return {
    datasetName: meta.datasetName,
    json: convertFromV1({ meta: meta.json, tree: tree.json }),
    resourceIndex: meta.resourceIndex,
  }
}

function isSidecarKind(value: string | undefined): value is SidecarKind {
  return value === "tipFrequencies" || value === "measurements" || value === "rootSequence"
}

function unknownResource(resource: DecodedResource): ClassifiedResource {
  return {
    diagnostics: [
      {
        resourceIndex: resource.resourceIndex,
        severity: "error",
        message: `${resource.effectiveName} could not be read as an Auspice v2 JSON dataset or a Newick tree.`,
      },
    ],
  }
}

async function decompress(bytes: Uint8Array, limitBytes: number): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const reader = stream.getReader()
  try {
    return await readBounded(reader, limitBytes)
  } finally {
    reader.releaseLock()
  }
}

async function readBounded(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  limitBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let byteLength = 0
  for (;;) {
    const result = await reader.read()
    if (result.done) return concatenate(chunks, byteLength)
    byteLength += result.value.byteLength
    if (byteLength > limitBytes) {
      const error = new Error(EXPANDED_LIMIT_MESSAGE)
      await reader.cancel(error)
      throw error
    }
    chunks.push(result.value)
  }
}

function concatenate(chunks: readonly Uint8Array[], byteLength: number): Uint8Array {
  const output = new Uint8Array(byteLength)
  chunks.reduce((offset, chunk) => {
    output.set(chunk, offset)
    return offset + chunk.byteLength
  }, 0)
  return output
}

function decodeText(resource: DecodedResource): string {
  return UTF8_DECODER.decode(resource.bytes)
}

function stripSuffix(name: string, suffixes: readonly string[]): string {
  const lower = name.toLowerCase()
  const suffix = suffixes.find((candidate) => lower.endsWith(candidate))
  return suffix === undefined ? name : name.slice(0, -suffix.length)
}
