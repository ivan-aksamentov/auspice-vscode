import { datasetSummary } from "@auspice/components/info/datasetSummary"
import FiltersSummary from "@auspice/components/info/filtersSummary"
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"

import { isHeaderStacked, treeDrawingSize } from "./layout"
import type { PanelSize } from "./layout"
import { TreeDownloadButtons } from "./TreeDownloadButtons"
import { useElementSize } from "./useElementSize"

/**
 * Auspice's tree card with a header row on its title row, as in Nextclade: the summary of the shown
 * tips and the active filters on the left, and the download buttons next to Auspice's zoom buttons
 * on the right. The row takes its own row above the card where the space left of the zoom buttons
 * is too narrow, and with two trees, which have zoom buttons each and their names in the title row.
 * The tree drawing gets the card size minus these rows (see `treeDrawingSize`).
 */
export function TreePanel({
  card,
  twoTrees,
  showHeader,
  children,
}: TreePanelProps): React.ReactElement {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRow = useTitleRowBox(panelRef)
  const actions = useElementSize<HTMLDivElement>()
  const headerStacked =
    showHeader &&
    isHeaderStacked({
      twoTrees,
      spaceLeftOfZoomButtons:
        titleRow === undefined ? Number.POSITIVE_INFINITY : titleRow.zoomLeft - titleRow.titleLeft,
      actionsWidth: actions.size?.width ?? 0,
    })
  const drawing = treeDrawingSize(card, { twoTrees, headerStacked })
  // The row ends at the zoom buttons beside it, or at the right end of the zoom buttons below it
  const headerStyle = useMemo<HeaderStyle | undefined>(
    () =>
      titleRow === undefined
        ? undefined
        : {
            "--auspice-vscode-header-left": `${titleRow.titleLeft}px`,
            "--auspice-vscode-header-right": `${titleRow.width - (headerStacked ? titleRow.zoomRight : titleRow.zoomLeft)}px`,
          },
    [titleRow, headerStacked],
  )
  const headerLayout = headerStacked ? "stacked" : "overlay"

  return (
    <div
      ref={panelRef}
      className="auspice-vscode-tree-panel"
      data-trees={twoTrees ? "two" : "one"}
      data-header={showHeader ? headerLayout : "none"}
    >
      {showHeader ? (
        <div className="auspice-vscode-tree-header" data-layout={headerLayout} style={headerStyle}>
          <div className="auspice-vscode-tree-summary">
            <TreeSummary />
          </div>
          <div ref={actions.ref} className="auspice-vscode-tree-actions">
            <TreeDownloadButtons />
          </div>
        </div>
      ) : null}
      {children(drawing)}
    </div>
  )
}

export interface TreePanelProps {
  /** Size of the tree card, from Auspice's panel sizes */
  readonly card: PanelSize
  readonly twoTrees: boolean
  /** Whether the header row shows: not in narratives and not with only the panels */
  readonly showHeader: boolean
  /** Render the tree card, with the size of its drawing */
  readonly children: (drawing: PanelSize) => React.ReactNode
}

/**
 * The summary of the shown tips and the active filters, as Auspice's info card writes it, or the
 * note that an animation runs
 */
function TreeSummary(): React.ReactElement {
  const { t } = useTranslation()
  const nodes = useSelector((state: SummaryState) => state.tree.nodes)
  const visibility = useSelector((state: SummaryState) => state.tree.visibility)
  const mainTreeNumTips = useSelector((state: SummaryState) => state.metadata.mainTreeNumTips)
  const branchLengthsToDisplay = useSelector(
    (state: SummaryState) => state.controls.branchLengthsToDisplay,
  )
  const animating = useSelector(
    (state: SummaryState) => state.controls.animationPlayPauseButton === "Pause",
  )
  if (animating) return <span>{`${t("Animation in progress")}.`}</span>
  return (
    <>
      {datasetSummary({ nodes, visibility, mainTreeNumTips, branchLengthsToDisplay, t })}{" "}
      <FiltersSummary />
    </>
  )
}

/**
 * Return where the parts of the tree card title row are, in layout pixels from the left edge of the
 * panel: the start of the title row and the zoom buttons. Measured before paint after each render,
 * and when the panel or the zoom buttons change size (e.g. "Show All Selected" in focus mode).
 */
function useTitleRowBox(panelRef: React.RefObject<HTMLDivElement | null>): TitleRowBox | undefined {
  const [box, setBox] = useState<TitleRowBox>()
  const watcher = useRef<TitleRowWatcher | undefined>(undefined)
  const measure = useCallback(() => {
    const panel = panelRef.current
    if (panel === null) return
    const next = measureTitleRow(panel)
    setBox((previous) => (sameBox(previous, next) ? previous : next))
  }, [panelRef])
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (panel === null) return undefined
    const current = new TitleRowWatcher(panel, () => {
      flushSync(measure)
    })
    watcher.current = current
    return () => {
      current.disconnect()
      watcher.current = undefined
    }
  }, [panelRef, measure])
  // Auspice renders the zoom buttons anew with the tree, so they are found after each render
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (panel === null) return
    watcher.current?.watchZoomButtons(zoomButtonsOf(panel))
    measure()
  })
  return box
}

/** Watches the sizes that place the header row: the tree panel, and the zoom buttons in it */
class TitleRowWatcher {
  readonly #observer: ResizeObserver
  #zoomButtons: Element | undefined

  constructor(panel: Element, onResize: () => void) {
    this.#observer = new ResizeObserver(onResize)
    this.#observer.observe(panel)
  }

  /** Watch the given zoom buttons instead of the ones watched so far */
  watchZoomButtons(zoomButtons: Element | undefined): void {
    if (zoomButtons === this.#zoomButtons) return
    if (this.#zoomButtons !== undefined) this.#observer.unobserve(this.#zoomButtons)
    if (zoomButtons !== undefined) this.#observer.observe(zoomButtons)
    this.#zoomButtons = zoomButtons
  }

  disconnect(): void {
    this.#observer.disconnect()
  }
}

/**
 * Return the boxes of the title row parts. Client rectangles include the scale of the viewer
 * (`--auspice-viewer-scale`), so they are divided by it to give the layout pixels of CSS.
 */
function measureTitleRow(panel: HTMLElement): TitleRowBox | undefined {
  const title = panel.querySelector(":scope > :last-child > #CardTitle")
  const zoomButtons = zoomButtonsOf(panel)
  if (title === null || zoomButtons === undefined || panel.offsetWidth === 0) return undefined
  const panelBox = panel.getBoundingClientRect()
  const scale = panelBox.width / panel.offsetWidth
  const titleBox = title.getBoundingClientRect()
  const zoomBox = zoomButtons.getBoundingClientRect()
  return {
    width: panel.offsetWidth,
    titleLeft: (titleBox.left - panelBox.left) / scale,
    zoomLeft: (zoomBox.left - panelBox.left) / scale,
    zoomRight: (zoomBox.right - panelBox.left) / scale,
  }
}

/**
 * Return the zoom buttons of the tree card: the last element in its content, which holds the
 * buttons of the second tree when two trees are shown. The card is the last element of the panel.
 */
function zoomButtonsOf(panel: HTMLElement): Element | undefined {
  return (
    panel.querySelector(":scope > :last-child > #CardContentContainer > div:last-child") ??
    undefined
  )
}

function sameBox(previous: TitleRowBox | undefined, next: TitleRowBox | undefined): boolean {
  return (
    previous === next ||
    (previous !== undefined &&
      next !== undefined &&
      previous.width === next.width &&
      previous.titleLeft === next.titleLeft &&
      previous.zoomLeft === next.zoomLeft &&
      previous.zoomRight === next.zoomRight)
  )
}

/** Places in the tree card title row, in layout pixels from the left edge of the panel */
interface TitleRowBox {
  readonly width: number
  readonly titleLeft: number
  readonly zoomLeft: number
  readonly zoomRight: number
}

type HeaderStyle = React.CSSProperties & Record<`--auspice-vscode-header-${string}`, string>

/** The parts of Auspice's state that the summary reads */
interface SummaryState {
  readonly tree: { readonly nodes: unknown; readonly visibility: unknown }
  readonly metadata: { readonly mainTreeNumTips: number }
  readonly controls: {
    readonly branchLengthsToDisplay: string
    readonly animationPlayPauseButton: string
  }
}
