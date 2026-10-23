import { hasMultipleGridPanels } from "@auspice/actions/panelDisplay"
import { REMOVE_TREE_TOO, UPDATE_METADATA } from "@auspice/actions/types"
import { changeURLMiddleware } from "@auspice/middleware/changeURL"
import { performanceFlags } from "@auspice/middleware/performanceFlags"
import { keepScatterplotStateInSync } from "@auspice/middleware/scatterplot"
import auspiceReducer from "@auspice/reducers"
import type { AuspiceState } from "@auspice/reducers"
import { configureStore } from "@reduxjs/toolkit"
import type { Action } from "redux"

import { choosePanels } from "./panels"

/** Type of the action that sets the viewer settings */
const VIEWER_SETTINGS = "auspice-vscode/VIEWER_SETTINGS"

/** Auspice's actions after which it turns every available panel on */
const PANEL_RESETS: ReadonlySet<string> = new Set([UPDATE_METADATA, REMOVE_TREE_TOO])

const initialViewerSettings: ViewerSettings = { mapsAvailable: false }

/**
 * The store of the viewer: Auspice's store (`src/store.ts`), with the same middleware, whose state
 * also holds the viewer settings, and which keeps the user's choice of panels (see `choosePanels`).
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

/** Return the action that sets the viewer settings */
export function setViewerSettings(settings: ViewerSettings): ViewerAction {
  return { type: VIEWER_SETTINGS, ...settings }
}

/** An action of Auspice or of the viewer */
export type ViewerAction = Action<string> & Readonly<Record<string, unknown>>

/** Auspice's state and the viewer settings */
export type ViewerState = AuspiceState & { readonly viewerSettings: ViewerSettings }

/** Settings of the viewer that Auspice's state has no place for */
export interface ViewerSettings {
  /** Whether this window can draw the map, which needs WebGL */
  readonly mapsAvailable: boolean
}

/**
 * Run Auspice's reducer on its part of the state, then keep the viewer settings and the panels.
 * Return the same state when nothing changes.
 */
function viewerReducer(state: ViewerState | undefined, action: ViewerAction): ViewerState {
  const previous = state === undefined ? undefined : auspiceStateOf(state)
  const next = auspiceReducer(previous, action)
  const settings = nextViewerSettings(state?.viewerSettings ?? initialViewerSettings, action)
  const panels = choosePanels({
    previous: previous?.controls,
    next: next.controls,
    keepUserChoices: PANEL_RESETS.has(action.type),
    mapsAvailable: settings.mapsAvailable,
  })
  const controls =
    panels === next.controls
      ? next.controls
      : {
          ...next.controls,
          ...panels,
          canTogglePanelLayout: hasMultipleGridPanels(panels.panelsToDisplay),
        }
  if (
    state !== undefined &&
    next === previous &&
    controls === next.controls &&
    settings === state.viewerSettings
  ) {
    return state
  }
  return { ...next, controls, viewerSettings: settings }
}

/**
 * Return Auspice's part of the state. Auspice's reducer returns this object itself when the action
 * changes nothing.
 */
function auspiceStateOf(state: ViewerState): AuspiceState {
  const { viewerSettings: _viewerSettings, ...auspiceState } = state
  return auspiceState
}

function nextViewerSettings(settings: ViewerSettings, action: ViewerAction): ViewerSettings {
  if (action.type !== VIEWER_SETTINGS) return settings
  const mapsAvailable = action["mapsAvailable"] === true
  return mapsAvailable === settings.mapsAvailable ? settings : { mapsAvailable }
}
