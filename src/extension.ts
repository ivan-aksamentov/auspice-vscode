import type { ExtensionContext, Uri } from "vscode"
import { commands, languages, TabInputCustom, TabInputText, window, workspace } from "vscode"

import { createViewerManager } from "./viewerManager.js"

const VIEW_TYPE = "auspiceVscode.viewer"

export function activate(context: ExtensionContext): void {
  const diagnostics = languages.createDiagnosticCollection("auspice")
  const manager = createViewerManager(context, diagnostics)
  context.subscriptions.push(
    diagnostics,
    window.registerCustomEditorProvider("auspiceVscode.viewer", manager.provider, {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions: {
        retainContextWhenHidden: workspace
          .getConfiguration("auspiceVscode")
          .get<boolean>("preserveBackgroundViews", true),
      },
    }),
    commands.registerCommand(
      "auspiceVscode.open",
      async (uri?: Uri, selectedUris?: readonly Uri[]) => {
        const source = uri ?? window.activeTextEditor?.document.uri
        await manager.open(source, selectedUris)
      },
    ),
    commands.registerCommand("auspiceVscode.toggle", async () => {
      const input = window.tabGroups.activeTabGroup.activeTab?.input
      if (input instanceof TabInputCustom && input.viewType === VIEW_TYPE) {
        await commands.executeCommand("vscode.openWith", input.uri, "default")
        return
      }
      const uri = input instanceof TabInputText ? input.uri : window.activeTextEditor?.document.uri
      if (uri === undefined) return
      await commands.executeCommand("vscode.openWith", uri, VIEW_TYPE)
    }),
    commands.registerCommand("auspiceVscode.reload", () => manager.reload()),
    commands.registerCommand("auspiceVscode.showDiagnostics", () => manager.showDiagnostics()),
    commands.registerCommand("auspiceVscode.openInTaxonium", () => manager.openInTaxonium()),
    commands.registerCommand("auspiceVscode.compareWithTree", () => manager.compareWithTree()),
    commands.registerCommand("auspiceVscode.addMetadata", () => manager.addMetadata()),
    commands.registerCommand("auspiceVscode.showInputs", () => manager.showInputs()),
    commands.registerCommand("auspiceVscode.openNarrative", () => manager.openNarrative()),
  )
}
