import { describe, expect, test } from "bun:test"

import { applyInitialPanels, applyMapSetting } from "../../src/auspice-client/panelSettings"

describe("map setting", () => {
  test("test_panel_settings_map_removes_map_panels_when_disabled", () => {
    const input = {
      meta: {
        panels: ["tree", "map", "entropy"],
        display_defaults: { panels: ["tree", "map"] },
      },
      tree: { name: "root" },
    }

    // Oracle: mapsEnabled=false means the Auspice map panel must not be available.
    expect(applyMapSetting(input, false)).toEqual({
      meta: {
        panels: ["tree", "entropy"],
        display_defaults: { panels: ["tree"] },
      },
      tree: { name: "root" },
    })
    expect(input.meta.panels).toEqual(["tree", "map", "entropy"])
  })

  test("test_panel_settings_map_preserves_dataset_when_enabled", () => {
    const input = { meta: { panels: ["tree", "map"] }, tree: { name: "root" } }

    expect(applyMapSetting(input, true)).toBe(input)
  })
})

// Oracle: Auspice shows the available panels that `display_defaults.panels` lists, and keeps the
// others available (auspice/src/actions/recomputeReduxState.js, `getInitialControlsState`)
describe("initial panels setting", () => {
  test("test_panel_settings_initial_tree_shows_only_the_tree_and_keeps_other_panels_available", () => {
    const input = {
      meta: {
        panels: ["tree", "map", "entropy", "frequencies"],
        display_defaults: { color_by: "country", panels: ["tree", "map", "entropy"] },
      },
      tree: { name: "root" },
    }

    const expected = {
      meta: {
        panels: ["tree", "map", "entropy", "frequencies"],
        display_defaults: { color_by: "country", panels: ["tree"] },
      },
      tree: { name: "root" },
    }
    expect(applyInitialPanels(input, "tree")).toEqual(expected)
    expect(input.meta.display_defaults.panels).toEqual(["tree", "map", "entropy"])
  })

  test("test_panel_settings_initial_tree_adds_display_defaults_to_a_dataset_without_them", () => {
    const input = { meta: { panels: ["tree", "measurements"] }, tree: { name: "root" } }

    const expected = {
      meta: { panels: ["tree", "measurements"], display_defaults: { panels: ["tree"] } },
      tree: { name: "root" },
    }
    expect(applyInitialPanels(input, "tree")).toEqual(expected)
  })

  test("test_panel_settings_initial_tree_applies_when_the_dataset_lists_no_panels", () => {
    // Auspice then offers the tree and the genetic diversity panel
    const input = { meta: { title: "No panels" }, tree: { name: "root" } }

    const expected = {
      meta: { title: "No panels", display_defaults: { panels: ["tree"] } },
      tree: { name: "root" },
    }
    expect(applyInitialPanels(input, "tree")).toEqual(expected)
  })

  test.each([
    {
      case: "the setting asks for the dataset's panels",
      input: { meta: { panels: ["tree", "map"] }, tree: { name: "root" } },
      initialPanels: "dataset" as const,
    },
    {
      case: "the dataset has no tree panel",
      input: { meta: { panels: ["map", "entropy"] }, tree: { name: "root" } },
      initialPanels: "tree" as const,
    },
    {
      case: "the dataset has no metadata",
      input: { tree: { name: "root" } },
      initialPanels: "tree" as const,
    },
  ])("test_panel_settings_initial_keeps_the_dataset_when_$case", ({ input, initialPanels }) => {
    expect(applyInitialPanels(input, initialPanels)).toBe(input)
  })
})
