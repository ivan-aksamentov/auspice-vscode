// Panel sizes of the viewer, by Auspice's rules: `calcPanelDims()` sizes each panel as a fraction
// of the panel area, and a panel below the visible area stays there, so the panel area scrolls.
// The tree card holds a header row on its title row (see `TreePanel`), and its drawing gets the
// card height minus that title row.

/** Height of the title row of the tree card, which holds the header row next to the zoom buttons */
export const CARD_TITLE_PX = 26

/**
 * Height of the title row of the tree card with two trees: Auspice writes the tree names in a 16 px
 * font, 25 px below the top of the card, so the row holds them above the trees
 */
export const CARD_TITLE_TWO_TREES_PX = 46

/** Height of the header row where it takes its own row above the tree card */
export const HEADER_ROW_PX = 26

/** Space between the summary and the download buttons in the header row */
export const HEADER_ITEM_GAP_PX = 16

/**
 * Narrowest summary (e.g. the active filters) that the header row keeps next to the zoom buttons.
 * Where the space left of the zoom buttons is narrower than the download buttons and this, the
 * header takes its own row above the tree card.
 */
export const HEADER_MIN_SUMMARY_PX = 120

/** Main panels (tree, map, measurements) stay this tall in short views, which then scroll */
export const MIN_MAIN_PANEL_HEIGHT_PX = 240

/**
 * Return the panel sizes: Auspice's sizes for the panel area, with the main panels at least
 * `MIN_MAIN_PANEL_HEIGHT_PX` tall, because editor panes can be short. A narrative shares the area
 * between the main panels and the charts by Auspice's fractions, so its sizes stay as they are.
 */
export function panelSizes(auspiceSizes: PanelSizes, view: PanelView): PanelSizes {
  if (view.narrative) return auspiceSizes
  return {
    ...auspiceSizes,
    full: withMinHeight(auspiceSizes.full),
    grid: withMinHeight(auspiceSizes.grid),
  }
}

/** Return the size of the tree drawing in a tree card of the given size */
export function treeDrawingSize(card: PanelSize, tree: TreeCardView): PanelSize {
  const title = tree.twoTrees ? CARD_TITLE_TWO_TREES_PX : CARD_TITLE_PX
  const headerRow = tree.headerStacked ? HEADER_ROW_PX : 0
  return { width: card.width, height: card.height - title - headerRow }
}

/**
 * Return whether the header row takes its own row above the tree card: with two trees, which have
 * zoom buttons each and their names in the title row, or where the space left of the zoom buttons
 * cannot hold the download buttons and a useful part of the summary
 */
export function isHeaderStacked(row: HeaderRowView): boolean {
  return (
    row.twoTrees ||
    row.spaceLeftOfZoomButtons < row.actionsWidth + HEADER_ITEM_GAP_PX + HEADER_MIN_SUMMARY_PX
  )
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

/** What the panel area shows */
export interface PanelView {
  /** Whether a narrative is shown, which shares the area between panels by fixed fractions */
  readonly narrative: boolean
}

/** What the tree card shows */
export interface TreeCardView {
  /** Whether the card shows two trees, which makes its title row taller */
  readonly twoTrees: boolean
  /** Whether the header row takes its own row above the card */
  readonly headerStacked: boolean
}

/** The title row of the tree card, as measured */
export interface HeaderRowView {
  readonly twoTrees: boolean
  /** Width from the start of the title row to the zoom buttons */
  readonly spaceLeftOfZoomButtons: number
  /** Width of the download buttons */
  readonly actionsWidth: number
}

function withMinHeight(size: PanelSize): PanelSize {
  return { ...size, height: Math.max(MIN_MAIN_PANEL_HEIGHT_PX, size.height) }
}
