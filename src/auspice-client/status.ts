import { useEffect, useState } from "react"

import { viewerStatusSchema } from "../protocol"
import type { ViewerStatus } from "../protocol"

// The bridge reports load/ready/stale/error transitions via a custom DOM event;
// the splash subscribes through this hook.
export function useViewerStatus(): ViewerStatus {
  const [status, setStatus] = useState<ViewerStatus>({ kind: "idle", message: "" })
  useEffect(() => {
    function handleStatus(event: Event): void {
      if (!(event instanceof CustomEvent)) return
      const parsed = viewerStatusSchema.safeParse(event.detail)
      if (parsed.success) setStatus(parsed.data)
    }
    window.addEventListener("auspice-vscode-status", handleStatus)
    return () => {
      window.removeEventListener("auspice-vscode-status", handleStatus)
    }
  }, [])
  return status
}
