import { TreeDownloadButtons } from "./TreeDownloadButtons"

// Auspice resolves customisations through `getExtension`/`hasExtension`
// (`@auspice/util/extensions`). Its stock implementation reads a build-time
// `EXTENSION_DATA` env var and loads components through webpack's
// `require.context`, which Bun cannot bundle, so the patch to `extensions.ts`
// imports this already-resolved registry instead. Values for `*Component` keys
// are components, not module names.
//
// The sidebar theme is the light theme of nextstrain.org and Nextclade, which
// matches the white panels next to it; Auspice's default sidebar is dark.
//
// Auspice names downloads after the page URL, which a webview does not have, so
// `filePrefix` gives them a fixed name ("view.svg") that the host prefixes with
// the dataset name in the save dialog.
const registry: Record<string, unknown> = {
  sidebarTheme: {
    background: "#F2F2F2",
    color: "#000",
    sidebarBoxShadow: "rgba(0, 0, 0, 0.2)",
    selectedColor: "#5097BA",
    unselectedColor: "#333",
    alternateBackground: "#888",
  },
  treeButtonsComponent: TreeDownloadButtons,
  filePrefix: "view",
  entryPage: "splash",
  enableDatasetEditor: true,
  finePrint: "Auspice runs locally inside VS Code.",
}

export default registry
