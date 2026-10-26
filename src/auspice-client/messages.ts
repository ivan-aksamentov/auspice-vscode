// `host.postMessage` matches the VS Code webview API (single argument), not
// `window.postMessage`; a `targetOrigin` argument would be invalid here.
/* oxlint-disable unicorn/require-post-message-target-origin */

// Store-free host messaging primitives. The toolbar and the extension registry
// depend on these post helpers; keeping them out of `bridge.ts` (which pulls in
// the Auspice store) avoids a circular import where the store's reducers run
// before the registry finishes initialising.
export const vscode: ViewerHost = createViewerHost()

/** Kinds of viewer status, which the toolbar styles */
export const VIEWER_STATUS_KINDS = [
  "idle",
  "loading",
  "ready",
  "stale",
  "warning",
  "error",
] as const

export interface ViewerStatus {
  readonly kind: (typeof VIEWER_STATUS_KINDS)[number]
  // Short summary shown in the toolbar.
  readonly message: string
  // Full list of error reasons, rendered as cards on the error splash. Empty
  // for non-error states or when the summary is the only detail.
  readonly messages?: readonly string[]
}

export interface ViewerHost {
  postMessage(message: ClientMessage): void
}

export type ClientMessage =
  | { readonly type: "ready" }
  | { readonly type: "reload" }
  | { readonly type: "showDiagnostics" }
  | {
      readonly type: "saveExport"
      readonly filename: string
      readonly mediaType: string
      readonly content: ArrayBuffer
    }
  | {
      readonly type: "diagnostics"
      readonly generation: number
      readonly diagnostics: readonly {
        readonly resourceIndex: number
        readonly severity: "error" | "warning" | "information"
        readonly message: string
      }[]
    }
  | { readonly type: "loadComplete"; readonly generation: number }
  | { readonly type: "requestNarrativeDatasets"; readonly names: readonly string[] }

export function postReload(): void {
  vscode.postMessage({ type: "reload" })
}

export function postShowDiagnostics(): void {
  vscode.postMessage({ type: "showDiagnostics" })
}

function createViewerHost(): ViewerHost {
  const api = acquireVsCodeApi()
  return {
    postMessage(message: ClientMessage): void {
      api.postMessage(message)
    },
  }
}
