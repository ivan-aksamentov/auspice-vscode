declare module "@auspice/reducers" {
  import type { Reducer } from "redux"

  /** Auspice's root state, with the parts that the viewer reads or changes */
  export interface AuspiceState {
    readonly controls: AuspiceControls
    /** Size of the viewer, which the shell measures (`BROWSER_DIMENSIONS`) */
    readonly browserDimensions: { readonly browserDimensions: { readonly width: number } }
    readonly [part: string]: unknown
  }

  /** Auspice's controls state, with the panel lists and the sidebar state */
  interface AuspiceControls {
    readonly panelsAvailable: readonly string[]
    readonly panelsToDisplay: readonly string[]
    readonly sidebarOpen: boolean
    readonly [control: string]: unknown
  }

  const rootReducer: Reducer<AuspiceState>
  export default rootReducer
}

declare module "@auspice/middleware/changeURL" {
  import type { Middleware } from "redux"

  /** Write the view into the page address, and read the dataset names from it */
  export const changeURLMiddleware: Middleware
}

declare module "@auspice/middleware/performanceFlags" {
  import type { Middleware } from "redux"

  /** Turn off costly drawing details for large trees */
  export const performanceFlags: Middleware
}

declare module "@auspice/middleware/scatterplot" {
  import type { Middleware } from "redux"

  /** Keep the scatterplot axes in step with the color-by and the layout */
  export const keepScatterplotStateInSync: Middleware
}

declare module "@auspice/components/controls/controls" {
  import type { ComponentType } from "react"

  const Controls: ComponentType
  export default Controls
}

declare module "@auspice/components/narrative" {
  import type { ComponentType } from "react"

  const Narrative: ComponentType<{ readonly height: number; readonly width: number }>
  export default Narrative
}

declare module "@auspice/components/narrative/MainDisplayMarkdown" {
  import type { ComponentType } from "react"

  const MainDisplayMarkdown: ComponentType<{ readonly width: number }>
  export default MainDisplayMarkdown
}

declare module "@auspice/components/narrative/renderNarrativeToggle" {
  import type { ReactElement } from "react"
  import type { Dispatch } from "redux"

  export function renderNarrativeToggle(
    dispatch: Dispatch,
    narrativeIsDisplayed: boolean,
  ): ReactElement
}

declare module "@auspice/components/info/byline" {
  import type { ComponentType } from "react"

  const Byline: ComponentType
  export default Byline
}

declare module "@auspice/components/info/warning" {
  import type { ComponentType } from "react"

  const Warning: ComponentType
  export default Warning
}

declare module "@auspice/components/info/filtersSummary" {
  import type { ComponentType } from "react"

  /** The active filters as badges, which remove their filter when clicked */
  const FiltersSummary: ComponentType
  export default FiltersSummary
}

declare module "@auspice/components/datasetEditor/datasetEditor" {
  /** Return whether the `enableDatasetEditor` extension turns the dataset editor on */
  export function enableDatasetEditor(): boolean
}

declare module "@auspice/components/datasetEditor/editButton" {
  import type { ComponentType } from "react"

  const EditButton: ComponentType
  export default EditButton
}

declare module "@auspice/components/datasetEditor/editedBanner" {
  import type { ComponentType } from "react"

  const EditedBanner: ComponentType
  export default EditedBanner
}

declare module "@auspice/globalStyles" {
  import type { CSSProperties } from "react"

  export const darkGrey: string
  /** Style of Auspice's tab buttons, such as the zoom buttons of the tree */
  export const tabSingle: CSSProperties
}

declare module "@auspice/components/framework/footer" {
  import type { ComponentType } from "react"

  const Footer: ComponentType<{ readonly width: number }>
  export default Footer
}

declare module "@auspice/components/framework/fine-print" {
  import type { ComponentType } from "react"

  const FinePrint: ComponentType<{ readonly width: number }>
  export default FinePrint
}

declare module "@auspice/components/framework/animationController" {
  import type { ComponentType } from "react"

  const AnimationController: ComponentType
  export default AnimationController
}

declare module "@auspice/components/framework/spinner" {
  import type { ComponentType } from "react"

  export const PanelSpinner: ComponentType<{ readonly width: number; readonly height: number }>
}

declare module "@auspice/components/modal/Modal.jsx" {
  import type { ComponentType } from "react"

  const Modal: ComponentType
  export default Modal
}

declare module "@auspice/components/errorBoundaries/panelErrorBoundary" {
  import type { ComponentType, ReactNode } from "react"

  const PanelErrorBoundary: ComponentType<{
    readonly width: number
    readonly height: number
    readonly name: string
    readonly children: ReactNode
  }>
  export default PanelErrorBoundary
}

declare module "@auspice/util/errorBoundary" {
  import type { ComponentType, ReactNode } from "react"

  const ErrorBoundary: ComponentType<{
    readonly showNothing?: boolean
    readonly children: ReactNode
  }>
  export default ErrorBoundary
}

declare module "@auspice/components/tree" {
  import type { ComponentType } from "react"

  const Tree: ComponentType<{ readonly width: number; readonly height: number }>
  export default Tree
}

declare module "@auspice/components/entropy" {
  import type { ComponentType } from "react"

  const Entropy: ComponentType<{ readonly width: number; readonly height: number }>
  export default Entropy
}

declare module "@auspice/components/frequencies" {
  import type { ComponentType } from "react"

  const Frequencies: ComponentType<{ readonly width: number; readonly height: number }>
  export default Frequencies
}

declare module "@auspice/components/measurements" {
  import type { ComponentType } from "react"

  const Measurements: ComponentType<{
    readonly width: number
    readonly height: number
    readonly showLegend: boolean
  }>
  export default Measurements
}

declare module "@auspice/components/map/map" {
  import type { ComponentType } from "react"

  const AuspiceMap: ComponentType<{
    readonly width: number
    readonly height: number
    readonly justGotNewDatasetRenderNewMap: boolean
    /** Sections of the map legend: the color swatches and the deme sizes */
    readonly legend: { readonly swatches: boolean; readonly demes: boolean }
  }>
  export default AuspiceMap
}

declare module "@auspice/components/main/styles" {
  // Auspice's sidebar theme: its defaults merged with the `sidebarTheme` extension
  export const sidebarTheme: {
    readonly background: string
    readonly color: string
    readonly "font-family": string
    readonly sidebarBoxShadow: string
    readonly selectedColor: string
    readonly unselectedColor: string
    readonly alternateBackground: string
  }
}

declare module "@auspice/components/main/utils" {
  interface PanelSize {
    readonly width: number
    readonly height: number
  }
  export function calcPanelDims(
    panels: readonly string[],
    narrativeIsDisplayed: boolean,
    availableWidth: number,
    availableHeight: number,
  ): {
    readonly full: PanelSize
    readonly grid: PanelSize
    readonly chartEntropy: PanelSize
    readonly chartFrequencies: PanelSize
  }
  export function calcStyles(
    browserDimensions: { readonly width: number; readonly height: number },
    displayNarrative: boolean,
    sidebarOpen: boolean,
    mobileDisplay: boolean,
  ): { readonly sidebarWidth: number }
}

declare module "@auspice/util/computeResponsive" {
  export function calcUsableWidth(availableWidth: number, fraction: number): number
}

declare module "@auspice/util/globals" {
  /** Widest viewer whose sidebar lies over the panels instead of beside them */
  export const controlsHiddenWidth: number
  export const narrativeNavBarHeight: number
  /** The style and attribution (HTML) of the map: the `mapTiles` extension, else Auspice's own */
  export function getMapTilesSettings(): { readonly style: unknown; readonly attribution: string }
}

declare module "@auspice/util/entropy" {
  /** Return the bars of the entropy panel for the visible tips, and their highest value */
  export function calcEntropyInView(
    nodes: unknown,
    visibility: unknown,
    selectedCds: unknown,
    showCounts: boolean,
  ): readonly [bars: unknown, maxYVal: number]
}

declare module "@auspice/version" {
  export const version: string
}

declare module "@auspice/components/info/datasetSummary" {
  import type { TFunction } from "i18next"

  /** Return the sentence that describes the shown tips, e.g. "Showing 3 of 3 genomes." */
  export function datasetSummary(options: {
    readonly nodes: unknown
    readonly visibility: unknown
    readonly mainTreeNumTips: number
    readonly branchLengthsToDisplay: string
    readonly t: TFunction
  }): string
}

declare module "@auspice/actions/panelDisplay" {
  /** Return the number of grid panels (tree, measurements, map) among the panels */
  export function numberOfGridPanels(panels: readonly string[]): number
  /** Return whether the panels hold two or more grid panels, between which Full and Grid choose */
  export function hasMultipleGridPanels(panels: readonly string[]): boolean
}

declare module "@auspice/components/download/helperFunctions" {
  import type { TFunction } from "i18next"
  import type { Dispatch } from "redux"

  export function SVG(
    dispatch: Dispatch,
    t: TFunction,
    metadata: unknown,
    nodes: unknown,
    visibility: unknown,
    filePrefix: string,
    panelsInDOM: readonly string[],
    panelLayout: string,
    publications: readonly unknown[],
    /**
     * Text lines (HTML) below the figure, in place of the lines that Auspice writes for nextstrain
     * datasets
     */
    caption?: readonly string[],
  ): Promise<void>
  export function auspiceJSON(dispatch: Dispatch, state: unknown, filePrefix: string): void
  /** Write the metadata of the visible tips (`<filePrefix>_metadata.tsv`) */
  export function strainTSV(
    dispatch: Dispatch,
    filePrefix: string,
    nodes: unknown,
    visibility: unknown,
  ): void
  /** Return whether a tip of the tree has an author */
  export function areAuthorsPresent(tree: { readonly nodes: unknown }): boolean
  /** Write the authors of the visible tips, with their publications (`<filePrefix>_authors.tsv`) */
  export function authorTSV(dispatch: Dispatch, filePrefix: string, tree: unknown): void
  /**
   * Write the accessions, laboratories and authors of the visible tips
   * (`<filePrefix>_acknowledgements.tsv`)
   */
  export function acknowledgmentsTSV(
    dispatch: Dispatch,
    filePrefix: string,
    nodes: unknown,
    visibility: unknown,
  ): void
  /** Write the bars of the entropy panel (`<filePrefix>_diversity.tsv`) */
  export function entropyTSV(dispatch: Dispatch, filePrefix: string, entropy: unknown): void
  export function exportTree(options: {
    readonly dispatch: Dispatch
    readonly filePrefix: string
    readonly tree: unknown
    readonly isNewick: boolean
    readonly temporal: boolean
  }): void
}

declare module "@auspice/components/download/downloadButtons" {
  export function getFilePrefix(): string
}

declare module "@auspice/components/download/downloadModal" {
  interface Publication {
    readonly author: string
    readonly title: string
    readonly journal: string
    readonly year: string
    readonly href: string
  }
  export const publications: { readonly nextstrain: Publication }
}

declare module "@auspice/actions/types" {
  export const BROWSER_DIMENSIONS: string
  export const CLEAN_START: string
  export const REMOVE_TREE_TOO: string
  export const TOGGLE_MOBILE_DISPLAY: string
  export const TOGGLE_SIDEBAR: string
  export const UPDATE_METADATA: string
}

declare module "@auspice/locales/en/language.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/locales/en/sidebar.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/locales/en/translation.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/locales/*/language.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/locales/*/sidebar.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/locales/*/translation.json" {
  const data: Record<string, string>
  export default data
}

declare module "@auspice/actions/recomputeReduxState" {
  export function createStateFromQueryOrJSONs(input: {
    readonly json: Record<string, unknown>
    readonly measurementsData?: unknown
    readonly secondTreeDataset?: Record<string, unknown> | false
    readonly query: Record<string, string>
    readonly narrativeBlocks?: readonly Record<string, unknown>[]
    readonly mainTreeName: string
    readonly secondTreeName?: string
    readonly dispatch: import("redux").Dispatch
  }): Record<string, unknown>
}

declare module "@auspice/actions/loadData" {
  export interface DatasetInstance {
    main?: Promise<Record<string, unknown>>
    tipFrequencies?: Promise<Record<string, unknown>>
    rootSequence?: Promise<Record<string, unknown>>
    measurements?: Promise<Record<string, unknown>>
    loadSidecars(dispatch: import("redux").Dispatch): void
  }
  export const Dataset: new (name: string) => DatasetInstance
  export function addEndOfNarrativeBlock(blocks: Record<string, unknown>[]): void
  export function getDatasetNamesFromUrl(url: string): readonly (string | undefined)[]
}

declare module "@auspice/util/parseNarrative" {
  export function parseMarkdownNarrativeFile(
    content: string,
    parser: (markdown: string) => string,
  ): Record<string, unknown>[]
}

declare module "@auspice/util/parseMarkdown" {
  export function parseMarkdown(markdown: string): string
}

declare module "@auspice/actions/filesDropped/filesDropped" {
  export function handleFilesDropped(
    files: FileList,
  ): import("redux-thunk").ThunkAction<Promise<void>, unknown, unknown, import("redux").AnyAction>
}

declare module "auspice/cli-build/server/convertJsonSchemas.js" {
  export function convertFromV1(input: {
    readonly tree: Record<string, unknown>
    readonly meta: Record<string, unknown>
  }): Record<string, unknown>
}

declare module "phylotree/src/formats/newick.js" {
  interface NewickNode {
    readonly name?: string | null
    readonly attribute?: string
    readonly children?: readonly NewickNode[]
  }
  interface NewickResult {
    readonly json: NewickNode | null
    readonly error: string | null
  }
  interface NewickOptions {
    readonly left_delimiter?: string
    readonly right_delimiter?: string
  }
  const newickParser: (content: string, options?: NewickOptions) => NewickResult
  export default newickParser
}
