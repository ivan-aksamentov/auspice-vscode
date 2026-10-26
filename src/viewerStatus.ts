// How the VS Code window shows the status of the active viewer. The status bar item carries the
// states that last (loading, changed inputs, errors); a warning is an event and becomes a
// notification instead.

import type { ViewerStatus } from "./protocol.js"

const PRESENTATIONS: Readonly<
  Record<ViewerStatus["kind"], (status: ViewerStatus) => StatusBarPresentation | undefined>
> = {
  idle: () => undefined,
  ready: () => undefined,
  warning: () => undefined,
  loading: (status) => ({
    text: "$(loading~spin) Auspice: loading",
    tooltip: status.message,
    command: undefined,
    backgroundColor: undefined,
  }),
  stale: () => ({
    text: "$(warning) Auspice: inputs changed",
    tooltip: "The input files of this view changed on disk. Select to reload the view.",
    command: "auspiceVscode.reload",
    backgroundColor: "statusBarItem.warningBackground",
  }),
  error: (status) => {
    const reasons =
      status.messages !== undefined && status.messages.length > 0
        ? status.messages
        : [status.message]
    return {
      text: `$(error) Auspice: ${reasons.length === 1 ? "1 error" : `${reasons.length} errors`}`,
      tooltip: [...reasons, "Select to show the problems."].join("\n"),
      command: "auspiceVscode.showDiagnostics",
      backgroundColor: "statusBarItem.errorBackground",
    }
  },
}

/** Return the status bar item of a viewer status, or `undefined` when the status needs none */
export function statusBarPresentation(status: ViewerStatus): StatusBarPresentation | undefined {
  return status.message === "" ? undefined : PRESENTATIONS[status.kind](status)
}

/** Status bar item of a viewer status */
export interface StatusBarPresentation {
  readonly text: string
  readonly tooltip: string
  // Command that a click on the item runs
  readonly command: string | undefined
  // Theme color of the item background
  readonly backgroundColor: string | undefined
}
