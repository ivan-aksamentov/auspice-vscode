import { strict as assert } from "node:assert"
import { resolve as resolvePath } from "node:path"

import {
  ConfigurationTarget,
  commands,
  extensions,
  TabInputCustom,
  TabInputText,
  Uri,
  window,
  workspace,
} from "vscode"

export async function run(): Promise<void> {
  const extension = extensions.getExtension("ivan-aksamentov.auspice-vscode")
  assert.ok(extension, "Auspice extension is installed in the development host")
  await extension.activate()
  const registered = await commands.getCommands(true)
  assert.ok(registered.includes("auspiceVscode.open"), "open command is registered")
  assert.ok(registered.includes("auspiceVscode.toggle"), "toggle command is registered")
  assert.ok(registered.includes("auspiceVscode.reload"), "reload command is registered")
  assert.ok(
    registered.includes("auspiceVscode.showDiagnostics"),
    "diagnostics command is registered",
  )
  assert.ok(registered.includes("auspiceVscode.openInTaxonium"), "Taxonium command is registered")
  assert.ok(
    registered.includes("auspiceVscode.compareWithTree"),
    "comparison command is registered",
  )
  assert.ok(registered.includes("auspiceVscode.addMetadata"), "metadata command is registered")
  assert.ok(registered.includes("auspiceVscode.openNarrative"), "narrative command is registered")
  assert.ok(registered.includes("auspiceVscode.showInputs"), "input-list command is registered")

  await workspace
    .getConfiguration("auspiceVscode")
    .update("mapsEnabled", false, ConfigurationTarget.Global)

  const root = process.env["AUSPICE_EXTENSION_ROOT"]
  assert.ok(root !== undefined && root !== "", "AUSPICE_EXTENSION_ROOT is defined")
  const fixture = Uri.file(resolvePath(root, "test", "__fixtures__", "viewer.auspice.json"))
  await commands.executeCommand("vscode.openWith", fixture, "auspiceVscode.viewer")
  assert.equal(window.tabGroups.activeTabGroup.activeTab?.label, "viewer.auspice.json")
  await commands.executeCommand("auspiceVscode.reload")
  await openViewer(fixture, 2)
  await openViewer(fixture, 3)
  const tabs = window.tabGroups.all.flatMap((group) => group.tabs)
  const viewerTabs = tabs.filter((tab) => tab.label === "viewer.auspice.json")
  assert.equal(
    viewerTabs.length,
    3,
    `each open command creates an independent viewer tab; tabs=${JSON.stringify(tabs.map((tab) => tab.label))}`,
  )
  await commands.executeCommand("workbench.action.closeAllEditors")

  await commands.executeCommand("vscode.openWith", fixture, "auspiceVscode.viewer")
  await waitForActiveTabInput((input) => input instanceof TabInputCustom)
  await commands.executeCommand("auspiceVscode.toggle")
  await waitForActiveTabInput((input) => input instanceof TabInputText)
  await commands.executeCommand("auspiceVscode.toggle")
  await waitForActiveTabInput((input) => input instanceof TabInputCustom)
  await commands.executeCommand("workbench.action.closeAllEditors")
}

async function waitForActiveTabInput(predicate: (input: unknown) => boolean): Promise<void> {
  if (predicate(window.tabGroups.activeTabGroup.activeTab?.input)) return
  await new Promise<void>((resolve) => {
    const subscription = window.tabGroups.onDidChangeTabs(() => {
      if (!predicate(window.tabGroups.activeTabGroup.activeTab?.input)) return
      subscription.dispose()
      resolve()
    })
  })
}

async function openViewer(uri: Uri, expectedTabCount: number): Promise<void> {
  const tabChange = waitForViewerTabCount(expectedTabCount)
  await commands.executeCommand("auspiceVscode.open", uri)
  await tabChange
}

function waitForViewerTabCount(expected: number): Promise<void> {
  if (viewerTabCount() >= expected) return Promise.resolve()
  return new Promise((resolve) => {
    const subscription = window.tabGroups.onDidChangeTabs(() => {
      if (viewerTabCount() < expected) return
      subscription.dispose()
      resolve()
    })
  })
}

function viewerTabCount(): number {
  return window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter((tab) => tab.label === "viewer.auspice.json").length
}
