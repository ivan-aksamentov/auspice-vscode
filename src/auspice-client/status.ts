import { useEffect, useState } from "react"

import type { ViewerStatus } from "./messages"

// The host reports load/ready/stale/error transitions to the webview via a
// custom DOM event; the toolbar and splash subscribe through this hook.
export function useViewerStatus(): ViewerStatus {
  const [status, setStatus] = useState<ViewerStatus>({ kind: "idle", message: "" })
  useEffect(() => {
    function handleStatus(event: Event): void {
      if (!(event instanceof CustomEvent) || !isViewerStatus(event.detail)) return
      setStatus(event.detail)
    }
    window.addEventListener("auspice-vscode-status", handleStatus)
    return () => {
      window.removeEventListener("auspice-vscode-status", handleStatus)
    }
  }, [])
  return status
}

function isViewerStatus(value: unknown): value is ViewerStatus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  if (!("kind" in value) || !("message" in value) || typeof value.message !== "string") return false
  if (
    "messages" in value &&
    !(Array.isArray(value.messages) && value.messages.every((item) => typeof item === "string"))
  ) {
    return false
  }
  return (
    value.kind === "idle" ||
    value.kind === "loading" ||
    value.kind === "ready" ||
    value.kind === "stale" ||
    value.kind === "error"
  )
}
