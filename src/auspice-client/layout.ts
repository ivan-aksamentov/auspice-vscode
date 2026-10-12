// Panel sizes of the viewer. Auspice sizes its panels as fractions of the window height minus
// fixed paddings (`calcPanelDims`), so the tree overflows short windows and wastes space in tall
// ones. The viewer measures the visible panel area and the info header above the panels, and
// fits the main panels (tree, map, measurements) into the space below the header.

/**
 * Height of the chrome that an Auspice card adds around its drawing, from `framework/card.js`: the
 * title row (16 px text and a 1 px top border, 25 px tall for two trees), the 8 px gap below it,
 * the 6 px bottom padding, the 10 px bottom margin, and the 2 px gap below the inline-block card on
 * its text line
 */
export const CARD_CHROME_PX = 20 + 8 + 6 + 10 + 2

/** Extra title row height of the tree card when it shows two trees (`tallTitle`) */
export const TALL_CARD_TITLE_EXTRA_PX = 6

/** Main panels stay this tall in short views, which then scroll */
export const MIN_MAIN_PANEL_HEIGHT_PX = 240

/**
 * Return the panel sizes for the visible panel area. Narratives keep Auspice's fractions, which
 * share the area between the main panels and the charts below them. Otherwise the main panels fill
 * the area below the info header, and the charts keep Auspice's sizes below the fold.
 */
export function fitPanelSizes(auspiceSizes: PanelSizes, view: PanelView): PanelSizes {
  if (view.narrative) return auspiceSizes
  const chrome = CARD_CHROME_PX + (view.twoTrees ? TALL_CARD_TITLE_EXTRA_PX : 0)
  const height = Math.max(
    MIN_MAIN_PANEL_HEIGHT_PX,
    Math.floor(view.height - view.headerHeight - chrome),
  )
  return {
    ...auspiceSizes,
    full: { ...auspiceSizes.full, height },
    grid: { ...auspiceSizes.grid, height },
  }
}

/** Width and height of a panel drawing, as Auspice's `calcPanelDims` returns them */
export interface PanelSize {
  readonly width: number
  readonly height: number
}

/** Sizes of the full-width, grid and chart panels, as Auspice's `calcPanelDims` returns them */
export interface PanelSizes {
  readonly full: PanelSize
  readonly grid: PanelSize
  readonly chartEntropy: PanelSize
  readonly chartFrequencies: PanelSize
}

/** The visible panel area and what it shows */
export interface PanelView {
  /** Height of the visible panel area */
  readonly height: number
  /** Height of the info header above the panels, including its bottom margin */
  readonly headerHeight: number
  /** Whether a narrative is shown, which shares the area between panels by fixed fractions */
  readonly narrative: boolean
  /** Whether the tree card shows two trees, which makes its title row taller */
  readonly twoTrees: boolean
}
