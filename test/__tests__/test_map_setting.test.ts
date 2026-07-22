import { describe, expect, test } from "bun:test"

import { applyMapSetting } from "../../src/auspice-client/mapSetting"

describe("map setting", () => {
  test("test_map_setting_removes_map_panels_when_disabled", () => {
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

  test("test_map_setting_preserves_dataset_when_enabled", () => {
    const input = { meta: { panels: ["tree", "map"] }, tree: { name: "root" } }

    expect(applyMapSetting(input, true)).toBe(input)
  })
})
