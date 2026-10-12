import { describe, expect, test } from "bun:test"

import { fitPanelSizes } from "../../src/auspice-client/layout"
import type { PanelSizes, PanelView } from "../../src/auspice-client/layout"

// Sizes as Auspice's calcPanelDims returns them for a 1000x800 panel area: 0.88 and 0.64 of the
// height minus 52 px for the full and grid panels, 0.36 of it (at least 300 or 200 px) for charts
const auspiceSizes: PanelSizes = {
  full: { width: 960, height: 652 },
  grid: { width: 450, height: 460 },
  chartEntropy: { width: 960, height: 300 },
  chartFrequencies: { width: 960, height: 236 },
}

const view: PanelView = { height: 800, headerHeight: 120, narrative: false, twoTrees: false }

describe("panel layout", () => {
  test("test_panel_layout_fits_main_panels_below_the_header", () => {
    const actual = fitPanelSizes(auspiceSizes, view)

    // Oracle: 800 px area - 120 px header - 46 px card chrome (20 title + 8 gap + 6 padding + 10
    // margin + 2 line gap, from Auspice's framework/card.js)
    expect(actual).toEqual({
      ...auspiceSizes,
      full: { width: 960, height: 634 },
      grid: { width: 450, height: 634 },
    })
  })

  test("test_panel_layout_leaves_room_for_the_taller_title_of_two_trees", () => {
    const actual = fitPanelSizes(auspiceSizes, { ...view, twoTrees: true })

    // Oracle: the title row of the tree card is 26 px instead of 20 px tall with two trees
    expect(actual.full.height).toBe(628)
  })

  test("test_panel_layout_keeps_a_minimum_height_in_short_views", () => {
    const actual = fitPanelSizes(auspiceSizes, { ...view, height: 300 })

    // Oracle: below 240 px the tree is unreadable; the panel area scrolls instead
    expect([actual.full.height, actual.grid.height]).toEqual([240, 240])
  })

  test("test_panel_layout_keeps_auspice_sizes_for_narratives", () => {
    const actual = fitPanelSizes(auspiceSizes, { ...view, narrative: true })

    // Oracle: a narrative shares the area between the tree and the charts by Auspice's fractions
    expect(actual).toEqual(auspiceSizes)
  })
})
