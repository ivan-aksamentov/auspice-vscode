import { hasMultipleGridPanels } from "@auspice/actions/panelDisplay"
import { CLEAN_START, REMOVE_TREE_TOO, UPDATE_METADATA } from "@auspice/actions/types"
import { changeURLMiddleware } from "@auspice/middleware/changeURL"
import { performanceFlags } from "@auspice/middleware/performanceFlags"
import { keepScatterplotStateInSync } from "@auspice/middleware/scatterplot"
import auspiceReducer from "@auspice/reducers"
import type { AuspiceState } from "@auspice/reducers"
import { controlsHiddenWidth } from "@auspice/util/globals"
import { configureStore } from "@reduxjs/toolkit"
import type { Action } from "redux"

import { choosePanels } from "./panels"
import { isSidebarOverlay, sidebarAfter } from "./sidebar"

/** Type of the action that sets whether the window can draw maps */
const MAPS_AVAILABLE = "auspice-vscode/MAPS_AVAILABLE"

/** Auspice's actions after which it turns every available panel on */
const PANEL_RESETS: ReadonlySet<string> = new Set([UPDATE_METADATA, REMOVE_TREE_TOO])

const initialViewer: Viewer = { mapsAvailable: false, dockedSidebarOpen: true }

/**
 * The store of the viewer: Auspice's store (`src/store.ts`), with the same middleware, whose state
 * also holds the viewer's own state, and which keeps the user's choice of panels (see
 * `choosePanels`) and lays the sidebar over the panels of a narrow viewer (see `sidebarAfter`).
 * Auspice's components reach it through the react-redux `Provider`.
 */
export const store = configureStore({
  reducer: viewerReducer,
  middleware: (getDefaultMiddleware) =>
    // Auspice's state holds circular references and values that are not serializable
    getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }).concat(
      keepScatterplotStateInSync,
      changeURLMiddleware,
      performanceFlags,
    ),
})

/** Return the action that sets whether this window can draw the map, which needs WebGL */
export function setMapsAvailable(mapsAvailable: boolean): ViewerAction {
  return { type: MAPS_AVAILABLE, mapsAvailable }
}

/** An action of Auspice or of the viewer */
export type ViewerAction = Action<string> & Readonly<Record<string, unknown>>

/** Auspice's state and the viewer's own state */
export type ViewerState = AuspiceState & { readonly viewer: Viewer }

/** State of the viewer that Auspice's state has no place for */
export interface Viewer {
  /** Whether this window can draw the map, which needs WebGL */
  readonly mapsAvailable: boolean
  /** The open state of the docked sidebar, kept while the sidebar lies over the panels */
  readonly dockedSidebarOpen: boolean
}

/**
 * Run Auspice's reducer on its part of the state, then apply the viewer's rules for the panels and
 * the sidebar. Return the same state when nothing changes.
 */
function viewerReducer(state: ViewerState | undefined, action: ViewerAction): ViewerState {
  const previous = state === undefined ? undefined : auspiceStateOf(state)
  const next = auspiceReducer(previous, action)
  const viewer = state?.viewer ?? initialViewer
  const mapsAvailable =
    action.type === MAPS_AVAILABLE ? action["mapsAvailable"] === true : viewer.mapsAvailable
  const panels = choosePanels({
    previous: previous?.controls,
    next: next.controls,
    keepUserChoices: PANEL_RESETS.has(action.type),
    mapsAvailable,
  })
  const sidebar = sidebarAfter({
    previous:
      previous === undefined
        ? undefined
        : {
            state: { open: previous.controls.sidebarOpen, dockedOpen: viewer.dockedSidebarOpen },
            overlay: isOverlay(previous),
          },
    next: {
      state: { open: next.controls.sidebarOpen, dockedOpen: viewer.dockedSidebarOpen },
      overlay: isOverlay(next),
    },
    loaded: action.type === CLEAN_START,
  })
  // Auspice decides whether Full and Grid can be chosen, unless the panels change here
  const panelControls =
    panels === next.controls
      ? {}
      : { ...panels, canTogglePanelLayout: hasMultipleGridPanels(panels.panelsToDisplay) }
  const controls =
    panels === next.controls && sidebar.open === next.controls.sidebarOpen
      ? next.controls
      : { ...next.controls, ...panelControls, sidebarOpen: sidebar.open }
  const nextViewer =
    mapsAvailable === viewer.mapsAvailable && sidebar.dockedOpen === viewer.dockedSidebarOpen
      ? viewer
      : { mapsAvailable, dockedSidebarOpen: sidebar.dockedOpen }
  if (
    state !== undefined &&
    next === previous &&
    controls === next.controls &&
    nextViewer === viewer
  ) {
    return state
  }
  return { ...next, controls, viewer: nextViewer }
}

/**
 * Return Auspice's part of the state. Auspice's reducer returns this object itself when the action
 * changes nothing.
 */
function auspiceStateOf(state: ViewerState): AuspiceState {
  const { viewer: _viewer, ...auspiceState } = state
  return auspiceState
}

/** Return whether the sidebar lies over the panels, from the viewer width in the state */
function isOverlay(state: AuspiceState): boolean {
  return isSidebarOverlay(state.browserDimensions.browserDimensions.width, controlsHiddenWidth)
}
