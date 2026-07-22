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

declare module "@auspice/components/main" {
  import type { ComponentType } from "react"

  const Main: ComponentType
  export default Main
}

declare module "@auspice/actions/types" {
  export const BROWSER_DIMENSIONS: string
  export const TOGGLE_MOBILE_DISPLAY: string
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

declare module "auspice/cli/server/convertJsonSchemas.js" {
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
