import { handleFilesDropped } from "@auspice/actions/filesDropped/filesDropped"
import store from "@auspice/store"
import i18n from "i18next"
import { z } from "zod"

import { loadIntoAuspice } from "./adapter"
import { parseViewerResources } from "./input"
import { vscode } from "./messages"
import type { ViewerStatus } from "./messages"

const resourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  bytes: z.instanceof(ArrayBuffer),
})
const hostMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("load"),
    generation: z.number().int().nonnegative(),
    resources: z.array(resourceSchema),
    resourceLimitBytes: z.number().int().positive(),
    largeTreeTipAdvisory: z.number().int().nonnegative(),
    mapsEnabled: z.boolean(),
    sidebarInitialState: z.enum(["open", "closed", "dataset"]),
    locale: z.string().min(2),
  }),
  z.object({ type: z.literal("stale"), stale: z.boolean() }),
  z.object({ type: z.literal("supersede"), generation: z.number().int().nonnegative() }),
  z.object({ type: z.literal("hostError"), message: z.string() }),
  z.object({ type: z.literal("setScale"), scale: z.number().positive() }),
  z.object({ type: z.literal("addMetadata"), resources: z.array(resourceSchema) }),
])
const exportSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().min(1),
  content: z.string(),
})
let latestGeneration = -1
let loadQueue = Promise.resolve()

window.addEventListener("message", handleHostMessage)
window.addEventListener("auspice-export", handleExport)
vscode.postMessage({ type: "ready" })

function handleHostMessage(event: MessageEvent<unknown>): void {
  const parsed = hostMessageSchema.safeParse(event.data)
  if (!parsed.success) return
  switch (parsed.data.type) {
    case "load": {
      const message = parsed.data
      latestGeneration = Math.max(latestGeneration, message.generation)
      loadQueue = loadQueue.then(
        () => load(message),
        () => load(message),
      )
      return
    }
    case "stale":
      dispatchStatus({ kind: "stale", message: parsed.data.stale ? "Inputs changed" : "" })
      return
    case "supersede":
      latestGeneration = Math.max(latestGeneration, parsed.data.generation)
      dispatchStatus({ kind: "loading", message: "Loading local data." })
      return
    case "hostError":
      dispatchStatus(reportErrors([parsed.data.message]))
      return
    case "setScale":
      document
        .getElementById("root")
        ?.style.setProperty("--auspice-viewer-scale", String(parsed.data.scale))
      return
    case "addMetadata":
      addMetadata(parsed.data.resources)
      return
  }
}

function addMetadata(resources: readonly Resource[]): void {
  const transfer = new DataTransfer()
  resources.forEach((resource) => {
    transfer.items.add(
      new File([resource.bytes], resource.name, { type: metadataMediaType(resource.name) }),
    )
  })
  void Promise.resolve(store.dispatch(handleFilesDropped(transfer.files))).catch(
    (error: unknown) => {
      dispatchStatus(reportErrors([error instanceof Error ? error.message : String(error)]))
    },
  )
}

function metadataMediaType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
  if (lower.endsWith(".tsv")) return "text/tab-separated-values"
  if (lower.endsWith(".json")) return "application/json"
  return "text/csv"
}

async function load(message: LoadMessage): Promise<void> {
  if (message.generation !== latestGeneration) return
  dispatchStatus({ kind: "loading", message: "Loading local data." })
  try {
    const inputs = await parseViewerResources(
      message.resources.map((resource) => ({
        ...resource,
        bytes: new Uint8Array(resource.bytes),
      })),
      message.resourceLimitBytes,
    )
    if (message.generation !== latestGeneration) return
    const missingNarrativeDatasets = inputs.narrative?.datasetNames.filter(
      (name) => !inputs.mains.some((main) => main.datasetName === name),
    )
    if (missingNarrativeDatasets !== undefined && missingNarrativeDatasets.length > 0) {
      vscode.postMessage({ type: "requestNarrativeDatasets", names: missingNarrativeDatasets })
      return
    }
    await i18n.changeLanguage(message.locale)
    const diagnostics = loadIntoAuspice(
      inputs,
      message.largeTreeTipAdvisory,
      message.mapsEnabled,
      message.sidebarInitialState,
      message.locale,
      () => message.generation === latestGeneration,
    )
    if (message.generation !== latestGeneration) return
    vscode.postMessage({ type: "diagnostics", generation: message.generation, diagnostics })
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    dispatchStatus(
      errors.length === 0
        ? { kind: "ready", message: "" }
        : reportErrors(errors.map((error) => error.message)),
    )
    vscode.postMessage({ type: "loadComplete", generation: message.generation })
  } catch (error: unknown) {
    if (message.generation !== latestGeneration) return
    const messageText = error instanceof Error ? error.message : String(error)
    vscode.postMessage({
      type: "diagnostics",
      generation: message.generation,
      diagnostics: [{ resourceIndex: 0, severity: "error", message: messageText }],
    })
    dispatchStatus(reportErrors([messageText]))
    vscode.postMessage({ type: "loadComplete", generation: message.generation })
  }
}

// Build the error status and echo every reason to the developer console. The
// toolbar shows the count; the splash renders each message as its own card.
function reportErrors(messages: readonly string[]): ViewerStatus {
  messages.forEach((message) => {
    console.error(`[auspice-vscode] ${message}`)
  })
  const summary = messages.length === 1 ? (messages.at(0) ?? "") : `${messages.length} input errors`
  return { kind: "error", message: summary, messages }
}

function handleExport(event: Event): void {
  if (!(event instanceof CustomEvent)) return
  const parsed = exportSchema.safeParse(event.detail)
  if (!parsed.success) return
  vscode.postMessage({
    type: "saveExport",
    filename: parsed.data.filename,
    mediaType: parsed.data.mediaType,
    content: new TextEncoder().encode(parsed.data.content).buffer,
  })
}

function dispatchStatus(detail: ViewerStatus): void {
  window.dispatchEvent(new CustomEvent("auspice-vscode-status", { detail }))
}

interface LoadMessage {
  readonly generation: number
  readonly resources: readonly {
    readonly uri: string
    readonly name: string
    readonly bytes: ArrayBuffer
  }[]
  readonly resourceLimitBytes: number
  readonly largeTreeTipAdvisory: number
  readonly mapsEnabled: boolean
  readonly sidebarInitialState: "open" | "closed" | "dataset"
  readonly locale: string
}

interface Resource {
  readonly uri: string
  readonly name: string
  readonly bytes: ArrayBuffer
}
