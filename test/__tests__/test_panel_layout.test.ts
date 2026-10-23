import { describe, expect, test } from "bun:test"

import { isHeaderStacked, panelSizes, treeDrawingSize } from "../../src/auspice-client/layout"
import type { PanelSizes } from "../../src/auspice-client/layout"

// Sizes as Auspice's calcPanelDims returns them for a 1000x800 panel area: 0.88 and 0.64 of the
// height minus 52 px for the full and grid panels, 0.36 of it (at least 300 or 200 px) for charts
const auspiceSizes: PanelSizes = {
  full: { width: 960, height: 652 },
  grid: { width: 450, height: 460 },
  chartEntropy: { width: 960, height: 300 },
  chartFrequencies: { width: 960, height: 236 },
}
// Sizes for a 1000x300 panel area, where the main panels are shorter than 240 px
const shortAreaSizes: PanelSizes = {
  full: { width: 960, height: 212 },
  grid: { width: 450, height: 140 },
  chartEntropy: { width: 960, height: 300 },
  chartFrequencies: { width: 960, height: 200 },
}

describe("panel layout", () => {
  test("test_panel_layout_keeps_auspice_sizes", () => {
    const actual = panelSizes(auspiceSizes, { narrative: false })

    // Oracle: the panels follow Auspice's rules, as on nextstrain.org
    expect(actual).toEqual(auspiceSizes)
  })

  test("test_panel_layout_keeps_a_minimum_height_of_main_panels_in_short_views", () => {
    const actual = panelSizes(shortAreaSizes, { narrative: false })

    // Oracle: below 240 px the tree is unreadable; the panel area scrolls instead. Charts keep
    // Auspice's minimum heights.
    expect(actual).toEqual({
      ...shortAreaSizes,
      full: { width: 960, height: 240 },
      grid: { width: 450, height: 240 },
    })
  })

  test("test_panel_layout_keeps_auspice_sizes_for_narratives", () => {
    const actual = panelSizes(shortAreaSizes, { narrative: true })

    // Oracle: a narrative shares the area between the tree and the charts by Auspice's fractions
    expect(actual).toEqual(shortAreaSizes)
  })

  test.each([
    { twoTrees: false, headerStacked: false, expected: 626 },
    { twoTrees: false, headerStacked: true, expected: 600 },
    { twoTrees: true, headerStacked: true, expected: 580 },
  ])(
    "test_panel_layout_tree_drawing_leaves_out_the_title_rows %o",
    ({ twoTrees, headerStacked, expected }) => {
      const actual = treeDrawingSize(auspiceSizes.full, { twoTrees, headerStacked })

      // Oracle: a 652 px card minus its title row (26 px, 46 px with two trees, because Auspice
      // writes the tree names 25 px below the top of the card in a 16 px font) and minus the
      // header row of 26 px when it takes its own row
      expect(actual).toEqual({ width: 960, height: expected })
    },
  )

  test.each([
    { twoTrees: false, spaceLeftOfZoomButtons: 436, expected: false },
    { twoTrees: false, spaceLeftOfZoomButtons: 435, expected: true },
    { twoTrees: true, spaceLeftOfZoomButtons: 2000, expected: true },
  ])(
    "test_panel_layout_header_row_stacks_where_the_title_row_is_too_narrow %o",
    ({ twoTrees, spaceLeftOfZoomButtons, expected }) => {
      const actual = isHeaderStacked({ twoTrees, spaceLeftOfZoomButtons, actionsWidth: 300 })

      // Oracle: the row beside the zoom buttons holds the download buttons (300 px), a 16 px gap
      // and at least 120 px of summary; two trees have zoom buttons and names of their own
      expect(actual).toBe(expected)
    },
  )
})
