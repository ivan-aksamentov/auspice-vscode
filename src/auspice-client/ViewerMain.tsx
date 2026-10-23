import { handleFilesDropped } from "@auspice/actions/filesDropped/filesDropped"
import { numberOfGridPanels } from "@auspice/actions/panelDisplay"
import { TOGGLE_SIDEBAR } from "@auspice/actions/types"
import Controls from "@auspice/components/controls/controls"
import PanelErrorBoundary from "@auspice/components/errorBoundaries/panelErrorBoundary"
import AnimationController from "@auspice/components/framework/animationController"
import FinePrint from "@auspice/components/framework/fine-print"
import Footer from "@auspice/components/framework/footer"
import { PanelSpinner } from "@auspice/components/framework/spinner"
import Info from "@auspice/components/info/info"
import { sidebarTheme } from "@auspice/components/main/styles"
import { calcPanelDims, calcStyles } from "@auspice/components/main/utils"
import Modal from "@auspice/components/modal/Modal.jsx"
import Narrative from "@auspice/components/narrative"
import MainDisplayMarkdown from "@auspice/components/narrative/MainDisplayMarkdown"
import { renderNarrativeToggle } from "@auspice/components/narrative/renderNarrativeToggle"
import Tree from "@auspice/components/tree"
import { calcUsableWidth } from "@auspice/util/computeResponsive"
import ErrorBoundary from "@auspice/util/errorBoundary"
import { narrativeNavBarHeight } from "@auspice/util/globals"
import React, { Suspense, lazy, useCallback, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { Dispatch } from "redux"
import { ThemeProvider } from "styled-components"

import { ViewerSplash } from "./components"
import { fitPanelSizes } from "./layout"
import type { PanelSize } from "./layout"
import { SidebarLayout } from "./SidebarLayout"
import { useElementSize } from "./useElementSize"

const Entropy = lazy(() => import("@auspice/components/entropy"))
const Frequencies = lazy(() => import("@auspice/components/frequencies"))
const Measurements = lazy(() => import("@auspice/components/measurements"))
const AuspiceMap = lazy(() => import("@auspice/components/map/map"))

/**
 * The viewer layout, in place of Auspice's `<Main>`: the same panels, controls, narrative and
 * modal, in a sidebar layout owned by the shell (see `SidebarLayout`) and sized from the measured
 * panel area (see `fitPanelSizes`). Auspice's `<Main>` sizes everything from the window, and opens
 * its sidebar with a tab that moves between its top corners.
 */
export function ViewerMain(): React.ReactElement {
  const loaded = useSelector((state: ViewerState) => state.metadata.loaded && state.tree.loaded)
  if (!loaded) return <ViewerSplash />
  return <LoadedViewer />
}

function LoadedViewer(): React.ReactElement {
  const dispatch = useDispatch()
  const sidebarOpen = useSelector((state: ViewerState) => state.controls.sidebarOpen)
  const narrativeDisplayed = useSelector((state: ViewerState) => state.narrative.display)
  const narrativeTitle = useSelector((state: ViewerState) => state.narrative.title)
  const browserDimensions = useSelector(
    (state: ViewerState) => state.browserDimensions.browserDimensions,
  )
  const { sidebarWidth } = calcStyles(browserDimensions, narrativeDisplayed, true, false)
  const toggleSidebar = useCallback(() => {
    dispatch({ type: TOGGLE_SIDEBAR, value: !sidebarOpen })
  }, [dispatch, sidebarOpen])
  useFilesDropped()

  const narrativeHeight = browserDimensions.height - narrativeNavBarHeight
  const sidebar = useMemo(
    () =>
      narrativeDisplayed ? (
        <>
          <h2 className="auspice-vscode-narrative-title">{narrativeTitle}</h2>
          <Narrative height={narrativeHeight} width={sidebarWidth} />
        </>
      ) : (
        <Controls />
      ),
    [narrativeDisplayed, narrativeTitle, narrativeHeight, sidebarWidth],
  )

  return (
    <ThemeProvider theme={sidebarTheme}>
      <AnimationController />
      <ErrorBoundary showNothing>
        <Modal />
      </ErrorBoundary>
      <SidebarLayout
        open={sidebarOpen}
        width={sidebarWidth}
        label={narrativeDisplayed ? "Narrative" : "Controls"}
        theme={sidebarTheme}
        onToggle={toggleSidebar}
        sidebar={sidebar}
      >
        <Panels />
      </SidebarLayout>
    </ThemeProvider>
  )
}

/** The panels of the dataset, as Auspice's `<Main>` shows them, sized to the panel area */
function Panels(): React.ReactElement {
  const dispatch = useDispatch<Dispatch>()
  const panels = useSelector((state: ViewerState) => state.controls.panelsToDisplay)
  const inGrid = useSelector((state: ViewerState) => state.controls.panelLayout === "grid")
  const showOnlyPanels = useSelector((state: ViewerState) => state.controls.showOnlyPanels)
  const secondTreeName = useSelector((state: ViewerState) => state.controls.showTreeToo)
  const narrativeDisplayed = useSelector((state: ViewerState) => state.narrative.display)
  const narrativeLoaded = useSelector((state: ViewerState) => state.narrative.loaded)
  const frequenciesLoaded = useSelector((state: ViewerState) => state.frequencies.loaded)
  const treeName = useSelector((state: ViewerState) => state.tree.name)
  const area = useElementSize<HTMLDivElement>()
  const header = useElementSize<HTMLDivElement>()

  const showHeader = !narrativeDisplayed && !showOnlyPanels
  // The panels wait for the header to be measured, so that the tree is not drawn twice on load.
  // Both measurements render before the first paint.
  const sizes =
    area.size === undefined || (showHeader && header.size === undefined)
      ? undefined
      : fitPanelSizes(
          calcPanelDims(panels, narrativeDisplayed, area.size.width, area.size.height),
          {
            height: area.size.height,
            headerHeight: showHeader ? (header.size?.height ?? 0) : 0,
            narrative: narrativeDisplayed,
            twoTrees: typeof secondTreeName === "string",
          },
        )
  // Tree names key the panels, so that they mount anew for a new dataset
  const key = `${treeName ?? ""}${typeof secondTreeName === "string" ? `:${secondTreeName}` : ""}`
  const mapInGrid = inGrid && numberOfGridPanels(panels) % 2 === 0
  // A map in the grid leaves the color swatches to the tree legend, as in Auspice's `<Main>`
  const mapLegend = useMemo(() => ({ swatches: !mapInGrid, demes: true }), [mapInGrid])
  const usableWidth = area.size === undefined ? 0 : calcUsableWidth(area.size.width, 1)

  return (
    <div ref={area.ref} className="auspice-vscode-panels-scroll">
      {narrativeLoaded && !panels.includes("MainDisplayMarkdown")
        ? renderNarrativeToggle(dispatch, narrativeDisplayed)
        : null}
      {area.size !== undefined && showHeader ? (
        <div ref={header.ref} className="auspice-vscode-panel-header">
          <Info width={usableWidth} />
        </div>
      ) : null}
      {sizes === undefined ? null : (
        <>
          {panels.includes("tree") ? (
            <Panel name="tree" size={inGrid ? sizes.grid : sizes.full}>
              <Tree {...(inGrid ? sizes.grid : sizes.full)} key={key} />
            </Panel>
          ) : null}
          {panels.includes("measurements") ? (
            <LazyPanel name="measurements" size={inGrid ? sizes.grid : sizes.full}>
              <Measurements
                {...(inGrid ? sizes.grid : sizes.full)}
                key={`${key}_measurements`}
                showLegend={!panels.includes("tree") || !inGrid}
              />
            </LazyPanel>
          ) : null}
          {panels.includes("map") ? (
            <LazyPanel name="map" size={mapInGrid ? sizes.grid : sizes.full}>
              <AuspiceMap
                {...(mapInGrid ? sizes.grid : sizes.full)}
                key={`${key}_map`}
                justGotNewDatasetRenderNewMap={false}
                legend={mapLegend}
              />
            </LazyPanel>
          ) : null}
          {panels.includes("entropy") ? (
            <Suspense fallback={null}>
              <Panel name="entropy" size={sizes.chartEntropy}>
                <Entropy {...sizes.chartEntropy} key={`${key}_entropy`} />
              </Panel>
            </Suspense>
          ) : null}
          {panels.includes("frequencies") && frequenciesLoaded ? (
            <Suspense fallback={null}>
              <Panel name="frequencies" size={sizes.chartFrequencies}>
                <Frequencies {...sizes.chartFrequencies} key={`${key}_frequencies`} />
              </Panel>
            </Suspense>
          ) : null}
          {showHeader ? <Footer width={usableWidth} /> : null}
          {showHeader ? <FinePrint width={usableWidth} /> : null}
          {narrativeDisplayed && panels.includes("MainDisplayMarkdown") ? (
            <MainDisplayMarkdown width={usableWidth} />
          ) : null}
        </>
      )}
    </div>
  )
}

/** A panel that shows an error in its place if it fails to render */
function Panel({ name, size, children }: PanelProps): React.ReactElement {
  return (
    <PanelErrorBoundary width={size.width} height={size.height} name={name}>
      {children}
    </PanelErrorBoundary>
  )
}

/** A panel that shows a spinner while Auspice loads its code */
function LazyPanel({ name, size, children }: PanelProps): React.ReactElement {
  const spinner = useMemo(
    () => <PanelSpinner width={size.width} height={size.height} />,
    [size.width, size.height],
  )
  return (
    <Suspense fallback={spinner}>
      <Panel name={name} size={size}>
        {children}
      </Panel>
    </Suspense>
  )
}

interface PanelProps {
  readonly name: string
  readonly size: PanelSize
  readonly children: React.ReactNode
}

/** Add the metadata files that the user drops on the viewer, as Auspice's `<Main>` does */
function useFilesDropped(): void {
  const dispatch = useDispatch()
  useEffect(() => {
    function preventDefault(event: DragEvent): void {
      event.preventDefault()
    }
    function addFiles(event: DragEvent): void {
      event.preventDefault()
      const files = event.dataTransfer?.files
      if (files !== undefined) void dispatch(handleFilesDropped(files))
    }
    document.addEventListener("dragover", preventDefault, false)
    document.addEventListener("drop", addFiles, false)
    return () => {
      document.removeEventListener("dragover", preventDefault)
      document.removeEventListener("drop", addFiles)
    }
  }, [dispatch])
}

/** The parts of Auspice's state that the layout reads */
interface ViewerState {
  readonly controls: {
    readonly panelsToDisplay: readonly string[]
    readonly panelLayout: string
    readonly sidebarOpen: boolean
    readonly showOnlyPanels: boolean
    readonly showTreeToo: string | false | undefined
  }
  readonly narrative: {
    readonly display: boolean
    readonly loaded: boolean
    readonly title?: string
  }
  readonly browserDimensions: {
    readonly browserDimensions: { readonly width: number; readonly height: number }
  }
  readonly frequencies: { readonly loaded: boolean }
  readonly metadata: { readonly loaded: boolean }
  readonly tree: { readonly loaded: boolean; readonly name?: string }
}
