interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): void
}

declare function acquireVsCodeApi(): VsCodeApi

interface Window {
  // Non-redux scratch space Auspice's animation controller reads and writes.
  NEXTSTRAIN?: Record<string, unknown>
}
