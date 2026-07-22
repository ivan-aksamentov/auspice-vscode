import { ViewerSplash } from "./components"

// Auspice resolves customisations through `getExtension`/`hasExtension`
// (`@auspice/util/extensions`). Its stock implementation reads a build-time
// `EXTENSION_DATA` env var and does a dynamic `require("@extensions/<name>")`,
// which the webpack build turns into a context module. Bun cannot resolve a
// dynamic require, so the patch to `extensions.ts` imports this already-resolved
// registry instead. Values for `*Component` keys are components, not module
// names.
//
// A null navbar suppresses Auspice's built-in content and its reserved row. The
// sidebar fold control remains available independently of the navbar content.
const registry: Record<string, unknown> = {
  navbarComponent: null,
  splashComponent: ViewerSplash,
  entryPage: "splash",
  browserTitle: "Auspice Tree Viewer",
  enableDatasetEditor: true,
  finePrint: "Auspice runs locally inside VS Code.",
}

export default registry
