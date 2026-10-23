import { BASEMAP_ATTRIBUTION, BASEMAP_STYLE } from "./basemap"

// Auspice resolves customisations through `getExtension`/`hasExtension`
// (`@auspice/util/extensions`). Its stock implementation reads a build-time
// `EXTENSION_DATA` env var and loads components through webpack's
// `require.context`, which Bun cannot bundle, so the patch to `extensions.ts`
// imports this already-resolved registry instead.
//
// The sidebar theme is the light theme of nextstrain.org and Nextclade, which
// matches the white panels next to it; Auspice's default sidebar is dark.
//
// Auspice names downloads after the page URL, which a webview does not have, so
// `filePrefix` gives them a fixed name ("view.svg") that the host prefixes with
// the dataset name in the save dialog.
//
// The map draws the Natural Earth basemap that ships with the extension (see
// `basemap.ts`) instead of Auspice's default tiles from a third-party server.
//
// Auspice's download modal describes nextstrain.org data (data use, license,
// publications). `downloadModal: false` turns it off; the download buttons above
// the tree replace it.
const registry: Record<string, unknown> = {
  mapTiles: { style: BASEMAP_STYLE, attribution: BASEMAP_ATTRIBUTION },
  sidebarTheme: {
    background: "#F2F2F2",
    color: "#000",
    sidebarBoxShadow: "rgba(0, 0, 0, 0.2)",
    selectedColor: "#5097BA",
    unselectedColor: "#333",
    alternateBackground: "#888",
  },
  filePrefix: "view",
  downloadModal: false,
  entryPage: "splash",
  enableDatasetEditor: true,
  finePrint: "Auspice runs locally inside VS Code.",
}

export default registry
