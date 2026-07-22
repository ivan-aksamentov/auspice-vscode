import { z } from "zod"

export const webviewMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("reload") }),
  z.object({
    type: z.literal("saveExport"),
    filename: z.string().min(1),
    mediaType: z.string().min(1),
    content: z.instanceof(ArrayBuffer),
  }),
  z.object({
    type: z.literal("diagnostics"),
    generation: z.number().int().nonnegative(),
    diagnostics: z.array(
      z.object({
        resourceIndex: z.number().int().nonnegative(),
        severity: z.enum(["error", "warning", "information"]),
        message: z.string().min(1),
      }),
    ),
  }),
  z.object({ type: z.literal("loadComplete"), generation: z.number().int().nonnegative() }),
  z.object({ type: z.literal("showDiagnostics") }),
  z.object({ type: z.literal("openInTaxonium") }),
  z.object({
    type: z.literal("requestNarrativeDatasets"),
    names: z.array(z.string().min(1)).min(1),
  }),
])

export interface ViewerResource {
  readonly uri: string
  readonly name: string
  readonly bytes: ArrayBuffer
}

export interface LoadMessage {
  readonly type: "load"
  readonly generation: number
  readonly resources: readonly ViewerResource[]
  readonly resourceLimitBytes: number
  readonly largeTreeTipAdvisory: number
  readonly mapsEnabled: boolean
  readonly sidebarInitialState: "open" | "closed" | "dataset"
  readonly locale: string
}

export interface StaleMessage {
  readonly type: "stale"
  readonly stale: boolean
}

export interface SupersedeMessage {
  readonly type: "supersede"
  readonly generation: number
}

export interface HostErrorMessage {
  readonly type: "hostError"
  readonly message: string
}

export interface SetScaleMessage {
  readonly type: "setScale"
  readonly scale: number
}

export interface AddMetadataMessage {
  readonly type: "addMetadata"
  readonly resources: readonly ViewerResource[]
}

export type HostMessage =
  | LoadMessage
  | StaleMessage
  | SupersedeMessage
  | HostErrorMessage
  | SetScaleMessage
  | AddMetadataMessage

export type WebviewMessage = z.infer<typeof webviewMessageSchema>
