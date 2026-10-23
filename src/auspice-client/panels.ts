// The panels that the viewer shows. Auspice decides which panels a dataset has (`panelsAvailable`)
// and which of them show (`panelsToDisplay`). After added metadata and after the second tree is
// removed, Auspice turns every available panel on, which would undo the user's choices and the
// `initialPanels` setting; the user's choice of each panel stays instead. A window without WebGL
// cannot draw the map, so the map is never available there.

/**
 * Return the panel lists after an action: Auspice's lists, with the user's choices kept where the
 * action would reset them, and without the map where maps are unavailable. Return `next` itself
 * when nothing changes, so that the components that read it do not render again.
 */
export function choosePanels({
  previous,
  next,
  keepUserChoices,
  mapsAvailable,
}: PanelChange): PanelLists {
  const chosen = keepUserChoices && previous !== undefined ? withUserChoices(previous, next) : next
  return mapsAvailable ? chosen : withoutMap(chosen)
}

/** The panel lists of Auspice's controls state */
export interface PanelLists {
  readonly panelsAvailable: readonly string[]
  readonly panelsToDisplay: readonly string[]
}

/** An action's change of the panel lists */
export interface PanelChange {
  /** The lists before the action; none before the first action */
  readonly previous: PanelLists | undefined
  /** The lists that Auspice computed for the action */
  readonly next: PanelLists
  /** Whether the action is one after which Auspice turns every available panel on */
  readonly keepUserChoices: boolean
  /** Whether this window can draw the map, which needs WebGL */
  readonly mapsAvailable: boolean
}

/**
 * Return the lists with each panel that was available before on or off as before. A panel that
 * becomes available for the first time turns on, as in Auspice (e.g. the map after added
 * coordinates).
 */
function withUserChoices(previous: PanelLists, next: PanelLists): PanelLists {
  const panelsToDisplay = next.panelsAvailable.filter(
    (panel) =>
      !previous.panelsAvailable.includes(panel) || previous.panelsToDisplay.includes(panel),
  )
  return sameList(panelsToDisplay, next.panelsToDisplay)
    ? next
    : { panelsAvailable: next.panelsAvailable, panelsToDisplay }
}

function withoutMap(panels: PanelLists): PanelLists {
  if (!panels.panelsAvailable.includes("map") && !panels.panelsToDisplay.includes("map")) {
    return panels
  }
  return {
    panelsAvailable: panels.panelsAvailable.filter((panel) => panel !== "map"),
    panelsToDisplay: panels.panelsToDisplay.filter((panel) => panel !== "map"),
  }
}

function sameList(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((item, index) => item === second[index])
}
