// The sidebar by Auspice's rule: docked beside the panels in a viewer wider than Auspice's
// `controlsHiddenWidth`, and laid over the panels, closed at first, in a narrower one. While the
// sidebar lies over the panels, the open state of the docked sidebar is kept, and it comes back
// when the viewer is wide again.

/** Return whether the sidebar lies over the panels of a viewer of the given width */
export function isSidebarOverlay(viewerWidth: number, controlsHiddenWidth: number): boolean {
  return viewerWidth <= controlsHiddenWidth
}

/**
 * Return the sidebar state after an action. The sidebar closes where it starts to lie over the
 * panels, and where a dataset loads into a narrow viewer; the docked state comes back where the
 * viewer becomes wide. Return `next.state` itself when nothing changes.
 */
export function sidebarAfter({ previous, next, loaded }: SidebarChange): SidebarState {
  if (next.overlay) {
    const entersOverlay = loaded || previous === undefined || !previous.overlay
    if (entersOverlay) return { open: false, dockedOpen: next.state.open }
    return sameState(next.state, { open: next.state.open, dockedOpen: previous.state.dockedOpen })
  }
  if (previous !== undefined && previous.overlay && !loaded) {
    return sameState(next.state, {
      open: previous.state.dockedOpen,
      dockedOpen: previous.state.dockedOpen,
    })
  }
  return sameState(next.state, { open: next.state.open, dockedOpen: next.state.open })
}

/** The open state of the sidebar, and the open state of the docked sidebar */
export interface SidebarState {
  readonly open: boolean
  /** The state to which the sidebar returns when it docks again */
  readonly dockedOpen: boolean
}

/** An action's change of the sidebar */
export interface SidebarChange {
  /** The sidebar before the action; none before the first action */
  readonly previous: SidebarView | undefined
  /** The sidebar after Auspice's reducer, with the remembered docked state from before */
  readonly next: SidebarView
  /** Whether the action loads a dataset (`CLEAN_START`) */
  readonly loaded: boolean
}

/** The sidebar state, and whether the viewer lays the sidebar over the panels */
export interface SidebarView {
  readonly state: SidebarState
  readonly overlay: boolean
}

function sameState(state: SidebarState, next: SidebarState): SidebarState {
  return state.open === next.open && state.dockedOpen === next.dockedOpen ? state : next
}
