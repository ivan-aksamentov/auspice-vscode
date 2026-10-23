/**
 * Leave the map out of the dataset's panels when this window cannot draw it (see `canDrawMaps`), so
 * that Auspice starts without a map panel that would fail
 */
export function applyMapSetting(
  json: Record<string, unknown>,
  mapsAvailable: boolean,
): Record<string, unknown> {
  if (mapsAvailable || !isRecord(json["meta"])) return json
  const meta = json["meta"]
  const panels = Array.isArray(meta["panels"])
    ? { panels: meta["panels"].filter((panel) => panel !== "map") }
    : {}
  const displayDefaults = isRecord(meta["display_defaults"])
    ? {
        display_defaults: {
          ...meta["display_defaults"],
          ...(Array.isArray(meta["display_defaults"]["panels"])
            ? { panels: meta["display_defaults"]["panels"].filter((panel) => panel !== "map") }
            : {}),
        },
      }
    : {}
  return { ...json, meta: { ...meta, ...panels, ...displayDefaults } }
}

/**
 * Show only the tree panel when the viewer starts, unless the setting asks for the dataset's own
 * panels. Auspice shows the available panels listed in `display_defaults.panels`, and the sidebar
 * keeps a toggle for every available panel. A dataset without a tree panel keeps its defaults.
 */
export function applyInitialPanels(
  json: Record<string, unknown>,
  initialPanels: InitialPanels,
): Record<string, unknown> {
  if (initialPanels === "dataset" || !isRecord(json["meta"])) return json
  const meta = json["meta"]
  if (Array.isArray(meta["panels"]) && !meta["panels"].includes("tree")) return json
  const displayDefaults = isRecord(meta["display_defaults"]) ? meta["display_defaults"] : {}
  return {
    ...json,
    meta: { ...meta, display_defaults: { ...displayDefaults, panels: ["tree"] } },
  }
}

/**
 * Return whether the webview can draw Auspice's map, which MapLibre renders with WebGL. A VS Code
 * window without hardware acceleration may have no WebGL, and the map panel then fails to render.
 */
export function canDrawMaps(): boolean {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
  context?.getExtension("WEBGL_lose_context")?.loseContext()
  return context !== null
}

/** The `initialPanels` setting: the tree only, or the panels the dataset shows by default */
export type InitialPanels = "tree" | "dataset"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
