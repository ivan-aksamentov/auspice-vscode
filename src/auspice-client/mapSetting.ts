export function applyMapSetting(
  json: Record<string, unknown>,
  mapsEnabled: boolean,
): Record<string, unknown> {
  if (mapsEnabled || !isRecord(json["meta"])) return json
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
