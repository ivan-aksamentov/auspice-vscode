// `host.postMessage` matches the VS Code webview API (single argument), not
// `window.postMessage`; a `targetOrigin` argument would be invalid here.
/* oxlint-disable unicorn/require-post-message-target-origin */

import type { ViewerStatus } from "../protocol"

// Store-free host messaging primitives. The extension registry depends on the
// host; keeping it out of `bridge.ts` (which pulls in the Auspice store) avoids
// a circular import where the store's reducers run before the registry
// finishes initialising.
export const vscode: ViewerHost = createViewerHost()

export interface ViewerHost {
  postMessage(message: ClientMessage): void
}

export type ClientMessage =
  | { readonly type: "ready" }
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
  | { readonly type: "status"; readonly status: ViewerStatus }

function createViewerHost(): ViewerHost {
  const api = acquireVsCodeApi()
  return {
    postMessage(message: ClientMessage): void {
      api.postMessage(message)
    },
  }
}
