import { describe, expect, test } from "bun:test"

import { choosePanels } from "../../src/auspice-client/panels"
import type { PanelLists } from "../../src/auspice-client/panels"

// A dataset with genome annotations, whose user turned the entropy panel off
const entropyOff: PanelLists = {
  panelsAvailable: ["tree", "entropy"],
  panelsToDisplay: ["tree"],
}

describe("panels", () => {
  test("test_panels_turn_on_a_map_that_added_coordinates_make_available", () => {
    // Oracle: Auspice's `_reduxControls()` adds the map to the available panels and shows them all
    const auspiceResult: PanelLists = {
      panelsAvailable: ["tree", "entropy", "map"],
      panelsToDisplay: ["tree", "entropy", "map"],
    }

    const actual = choosePanels({
      previous: entropyOff,
      next: auspiceResult,
      keepUserChoices: true,
      mapsAvailable: true,
    })

    expect(actual).toEqual({
      panelsAvailable: ["tree", "entropy", "map"],
      panelsToDisplay: ["tree", "map"],
    })
  })

  test.each([
    { action: "UPDATE_METADATA", previous: entropyOff },
    {
      action: "REMOVE_TREE_TOO",
      previous: { panelsAvailable: ["tree", "map", "entropy"], panelsToDisplay: ["tree"] },
    },
  ])("test_panels_keep_a_panel_that_the_user_turned_off_after_%o", ({ previous }) => {
    // Oracle: Auspice shows every available panel after both actions
    const auspiceResult: PanelLists = {
      panelsAvailable: previous.panelsAvailable,
      panelsToDisplay: previous.panelsAvailable,
    }

    const actual = choosePanels({
      previous,
      next: auspiceResult,
      keepUserChoices: true,
      mapsAvailable: true,
    })

    expect(actual.panelsToDisplay).toEqual(["tree"])
  })

  test("test_panels_leave_out_the_map_without_webgl", () => {
    const auspiceResult: PanelLists = {
      panelsAvailable: ["tree", "map", "entropy"],
      panelsToDisplay: ["tree", "map", "entropy"],
    }

    const actual = choosePanels({
      previous: entropyOff,
      next: auspiceResult,
      keepUserChoices: true,
      mapsAvailable: false,
    })

    expect(actual).toEqual({ panelsAvailable: ["tree", "entropy"], panelsToDisplay: ["tree"] })
  })

  test("test_panels_keep_the_result_of_other_actions", () => {
    // Oracle: the user turns the entropy panel on in the sidebar (`TOGGLE_PANEL_DISPLAY`)
    const auspiceResult: PanelLists = {
      panelsAvailable: ["tree", "entropy"],
      panelsToDisplay: ["tree", "entropy"],
    }

    const actual = choosePanels({
      previous: entropyOff,
      next: auspiceResult,
      keepUserChoices: false,
      mapsAvailable: true,
    })

    expect(actual).toBe(auspiceResult)
  })

  test("test_panels_return_the_same_lists_when_the_choices_agree", () => {
    const auspiceResult: PanelLists = { ...entropyOff }

    const actual = choosePanels({
      previous: entropyOff,
      next: auspiceResult,
      keepUserChoices: true,
      mapsAvailable: false,
    })

    expect(actual).toBe(auspiceResult)
  })
})
