import { describe, expect, test } from "bun:test"

import { isSidebarOverlay, sidebarAfter } from "../../src/auspice-client/sidebar"
import type { SidebarState } from "../../src/auspice-client/sidebar"

// Oracle: Auspice's `controlsHiddenWidth` (src/util/globals.js); Auspice docks the sidebar when
// the window is wider (`window.innerWidth > controlsHiddenWidth` in src/reducers/controls.ts)
const CONTROLS_HIDDEN_WIDTH = 780

const openDocked: SidebarState = { open: true, dockedOpen: true }

describe("sidebar", () => {
  test.each([
    { width: 780, overlay: true },
    { width: 781, overlay: false },
  ])("test_sidebar_lies_over_the_panels_up_to_auspice_breakpoint %o", ({ width, overlay }) => {
    expect(isSidebarOverlay(width, CONTROLS_HIDDEN_WIDTH)).toBe(overlay)
  })

  test("test_sidebar_closes_and_keeps_its_docked_state_when_the_viewer_narrows", () => {
    const actual = sidebarAfter({
      previous: { state: openDocked, overlay: false },
      next: { state: openDocked, overlay: true },
      loaded: false,
    })

    expect(actual).toEqual({ open: false, dockedOpen: true })
  })

  test("test_sidebar_returns_to_its_docked_state_when_the_viewer_widens", () => {
    // The user opened the sidebar over the panels and closed it again
    const actual = sidebarAfter({
      previous: { state: { open: false, dockedOpen: true }, overlay: true },
      next: { state: { open: false, dockedOpen: true }, overlay: false },
      loaded: false,
    })

    expect(actual).toEqual({ open: true, dockedOpen: true })
  })

  test("test_sidebar_opens_over_the_panels_and_keeps_its_docked_state", () => {
    const actual = sidebarAfter({
      previous: { state: { open: false, dockedOpen: false }, overlay: true },
      next: { state: { open: true, dockedOpen: false }, overlay: true },
      loaded: false,
    })

    expect(actual).toEqual({ open: true, dockedOpen: false })
  })

  test("test_sidebar_starts_closed_when_a_dataset_loads_into_a_narrow_viewer", () => {
    // Auspice's state after the load holds the `sidebarInitialState` setting, here "open"
    const actual = sidebarAfter({
      previous: { state: { open: true, dockedOpen: false }, overlay: true },
      next: { state: { open: true, dockedOpen: false }, overlay: true },
      loaded: true,
    })

    expect(actual).toEqual({ open: false, dockedOpen: true })
  })

  test("test_sidebar_keeps_a_toggle_of_the_docked_sidebar", () => {
    const next = { open: false, dockedOpen: true }

    const actual = sidebarAfter({
      previous: { state: openDocked, overlay: false },
      next: { state: next, overlay: false },
      loaded: false,
    })

    expect(actual).toEqual({ open: false, dockedOpen: false })
  })

  test("test_sidebar_returns_the_same_state_when_nothing_changes", () => {
    const actual = sidebarAfter({
      previous: { state: openDocked, overlay: false },
      next: { state: openDocked, overlay: false },
      loaded: false,
    })

    expect(actual).toBe(openDocked)
  })
})
