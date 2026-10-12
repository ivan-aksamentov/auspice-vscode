declare module "@auspice/store" {
  import type { AnyAction, Store } from "redux"
  import type { ThunkDispatch } from "redux-thunk"

  // Auspice configures its store with redux-thunk, so `dispatch` accepts both
  // plain actions and thunks. Typing it as the real redux store keeps
  // react-redux's `Provider` happy while still accepting the thunk dispatches
  // the adapter performs.
  const store: Store & { dispatch: ThunkDispatch<unknown, unknown, AnyAction> }
  export default store
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

declare module "@auspice/components/info/info" {
  import type { ComponentType } from "react"

  const Info: ComponentType<{ readonly width: number }>
  export default Info
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
    readonly legend: boolean
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
  export const narrativeNavBarHeight: number
}

declare module "@auspice/actions/panelDisplay" {
  export function numberOfGridPanels(panels: readonly string[]): number
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
  ): void
  export function auspiceJSON(dispatch: Dispatch, state: unknown, filePrefix: string): void
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
  export function relevantPublications(colorBy: string): readonly unknown[]
}

declare module "@auspice/actions/types" {
  export const BROWSER_DIMENSIONS: string
  export const TOGGLE_MOBILE_DISPLAY: string
  export const TOGGLE_SIDEBAR: string
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
