import { describe, expect, test } from "bun:test"

import type { ViewerStatus } from "../../src/protocol"
import { statusBarPresentation } from "../../src/viewerStatus"

describe("viewer status in the status bar", () => {
  test.each<[string, ViewerStatus]>([
    ["idle", { kind: "idle", message: "" }],
    ["ready", { kind: "ready", message: "" }],
    ["cleared stale mark", { kind: "stale", message: "" }],
    ["warning, which is a notification", { kind: "warning", message: "The map needs WebGL." }],
  ])("test_viewer_status_hides_the_item_when_%s", (_name, status) => {
    expect(statusBarPresentation(status)).toBeUndefined()
  })

  test("test_viewer_status_shows_a_spinner_while_loading", () => {
    const expected = {
      text: "$(loading~spin) Auspice: loading",
      tooltip: "Loading local data.",
      command: undefined,
      backgroundColor: undefined,
    }

    expect(statusBarPresentation({ kind: "loading", message: "Loading local data." })).toEqual(
      expected,
    )
  })

  test("test_viewer_status_offers_a_reload_when_the_inputs_changed", () => {
    const expected = {
      text: "$(warning) Auspice: inputs changed",
      tooltip: "The input files of this view changed on disk. Select to reload the view.",
      command: "auspiceVscode.reload",
      backgroundColor: "statusBarItem.warningBackground",
    }

    expect(statusBarPresentation({ kind: "stale", message: "Inputs changed" })).toEqual(expected)
  })

  test("test_viewer_status_counts_the_errors_and_lists_them_in_the_tooltip", () => {
    const status: ViewerStatus = {
      kind: "error",
      message: "2 input errors",
      messages: ["The tree has no root.", "The metadata has no name column."],
    }
    const expected = {
      text: "$(error) Auspice: 2 errors",
      tooltip:
        "The tree has no root.\nThe metadata has no name column.\nSelect to show the problems.",
      command: "auspiceVscode.showDiagnostics",
      backgroundColor: "statusBarItem.errorBackground",
    }

    expect(statusBarPresentation(status)).toEqual(expected)
  })

  test("test_viewer_status_uses_the_summary_of_an_error_without_a_list", () => {
    const expected = {
      text: "$(error) Auspice: 1 error",
      tooltip: "The webview did not accept the dataset.\nSelect to show the problems.",
      command: "auspiceVscode.showDiagnostics",
      backgroundColor: "statusBarItem.errorBackground",
    }

    expect(
      statusBarPresentation({ kind: "error", message: "The webview did not accept the dataset." }),
    ).toEqual(expected)
  })
})
