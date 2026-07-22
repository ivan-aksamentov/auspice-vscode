import { basename, dirname } from "node:path"

import type {
  CancellationToken,
  CustomDocument,
  CustomReadonlyEditorProvider,
  DiagnosticCollection,
  Disposable,
  ExtensionContext,
  Uri,
  WebviewPanel,
} from "vscode"
import {
  commands,
  env,
  RelativePattern,
  ViewColumn,
  Uri as VsCodeUri,
  window,
  workspace,
} from "vscode"

import type { InputDiagnostic } from "./diagnostics.js"
import { replaceDiagnostics } from "./diagnostics.js"
import type { HostMessage, WebviewMessage } from "./protocol.js"
import { webviewMessageSchema } from "./protocol.js"
import {
  readResource,
  resolveDatasetUris,
  resolveNarrativeDatasetUris,
  resourceLimitBytes,
} from "./resources.js"
import { configureWebview } from "./webview.js"

const VIEW_TYPE = "auspiceVscode.viewer"
const TAXONIUM_URL = "https://taxonium.org/"
const AUSPICE_LOCALES = new Set([
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "lt",
  "pl",
  "pt",
  "ru",
  "tr",
  "zh",
])

export function createViewerManager(
  context: ExtensionContext,
  diagnostics: DiagnosticCollection,
): ViewerManager {
  let activeSession: ViewerSession | undefined
  const sessions = new Set<ViewerSession>()
  const tabIconUri = VsCodeUri.joinPath(context.extensionUri, "assets", "img", "logo-tab-32.png")
  const diagnosticsBySession = new Map<symbol, readonly InputDiagnostic[]>()

  async function open(uri?: Uri, selectedUris?: readonly Uri[]): Promise<void> {
    const primaries = selectedUris !== undefined && selectedUris.length > 0 ? selectedUris : [uri]
    await Promise.all(
      primaries.flatMap((primary) => (primary === undefined ? [] : [openPrimary(primary)])),
    )
  }

  async function openPrimary(uri: Uri): Promise<void> {
    const identity = v1Identity(uri)
    const existing = Array.from(sessions).find(
      (session) => identity !== undefined && session.identity === identity,
    )
    if (existing !== undefined) {
      existing.panel.reveal(ViewColumn.Active, false)
      return
    }
    const panel = window.createWebviewPanel(
      VIEW_TYPE,
      viewerTitle(uri),
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      { retainContextWhenHidden: preserveBackgroundViews(uri) },
    )
    await createSession(panel, uri)
  }

  async function reload(): Promise<void> {
    await activeSession?.reload()
  }

  async function showDiagnostics(): Promise<void> {
    await commands.executeCommand("workbench.actions.view.problems")
  }

  async function openInTaxonium(): Promise<void> {
    if (activeSession === undefined) return
    await activeSession.openInTaxonium()
  }

  async function compareWithTree(): Promise<void> {
    if (activeSession === undefined) return
    const selected = await window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Compare trees",
      filters: { "Auspice or Newick tree": ["json", "auspicejson", "new", "nwk", "newick", "gz"] },
    })
    const uri = selected?.at(0)
    if (uri === undefined) return
    const source = activeSession.uri
    const panel = window.createWebviewPanel(
      VIEW_TYPE,
      `${viewerTitle(source)} ↔ ${viewerTitle(uri)}`,
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      { retainContextWhenHidden: preserveBackgroundViews(source) },
    )
    await createSession(panel, source, undefined, uri)
  }

  async function addMetadata(): Promise<void> {
    if (activeSession === undefined) return
    const selected = await window.showOpenDialog({
      canSelectMany: true,
      openLabel: "Add metadata",
      filters: { Metadata: ["csv", "tsv", "xlsx", "json"] },
    })
    if (selected !== undefined && selected.length > 0) await activeSession.addMetadata(selected)
  }

  async function showInputs(): Promise<void> {
    if (activeSession === undefined) return
    await activeSession.showInputs()
  }

  async function openNarrative(): Promise<void> {
    const selected = await window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Open narrative",
      filters: { "Nextstrain narrative": ["md"] },
    })
    const uri = selected?.at(0)
    if (uri !== undefined) await openPrimary(uri)
  }

  const provider: CustomReadonlyEditorProvider = {
    openCustomDocument(uri): CustomDocument {
      return { uri, dispose() {} }
    },
    async resolveCustomEditor(document, panel, token: CancellationToken): Promise<void> {
      panel.title = viewerTitle(document.uri)
      await createSession(panel, document.uri, token)
    },
  }

  function registerSession(session: ViewerSession): void {
    sessions.add(session)
    if (session.panel.active) setActiveSession(session)
    const viewStateSubscription = session.panel.onDidChangeViewState((event) => {
      if (event.webviewPanel.active) {
        setActiveSession(session)
      } else if (activeSession === session) {
        setActiveSession(Array.from(sessions).find((candidate) => candidate.panel.active))
      }
    })
    const disposeSubscription = session.panel.onDidDispose(() => {
      sessions.delete(session)
      session.dispose()
      diagnosticsBySession.delete(session.diagnosticsKey)
      refreshDiagnostics()
      if (activeSession === session) {
        setActiveSession(Array.from(sessions).find((candidate) => candidate.panel.active))
      }
    })
    session.addSubscriptions([viewStateSubscription, disposeSubscription])
  }

  function setActiveSession(session: ViewerSession | undefined): void {
    activeSession = session
    void Promise.resolve(
      commands.executeCommand("setContext", "auspiceVscode.viewerActive", session !== undefined),
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      void window.showErrorMessage(`Auspice could not update viewer actions: ${message}`)
    })
  }

  function createSession(
    panel: WebviewPanel,
    uri: Uri,
    token?: CancellationToken,
    comparisonUri?: Uri,
  ): Promise<ViewerSession> {
    panel.iconPath = tabIconUri
    const diagnosticsKey = Symbol("viewer diagnostics")
    const session = createViewerSession(
      panel,
      uri,
      diagnosticsKey,
      (items) => {
        diagnosticsBySession.set(diagnosticsKey, items)
        refreshDiagnostics()
      },
      reloadWebview,
      comparisonUri,
    )
    function reloadWebview(): void {
      configureWebview(context, panel.webview, {
        mapsEnabled: mapsEnabled(uri),
        viewerScale: viewerScale(uri),
        isCancelled: () => token?.isCancellationRequested === true || session.isDisposed(),
      })
    }
    registerSession(session)
    try {
      if (token?.isCancellationRequested === true || session.isDisposed()) {
        panel.dispose()
        return Promise.resolve(session)
      }
      reloadWebview()
      return Promise.resolve(session)
    } catch (error: unknown) {
      panel.dispose()
      throw error
    }
  }

  function refreshDiagnostics(): void {
    replaceDiagnostics(diagnostics, Array.from(diagnosticsBySession.values()).flat())
  }

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(() => {
      setActiveSession(Array.from(sessions).find((session) => session.panel.active))
    }),
    // The editor zoom scales webview content at the Electron level, so the
    // counter-scale must follow both the viewer's own zoom setting and the
    // editor zoom it cancels. Neither change reloads the webview, so push the
    // new scale to every live session.
    workspace.onDidChangeConfiguration((event) => {
      if (
        !event.affectsConfiguration("auspiceVscode.zoom") &&
        !event.affectsConfiguration("window.zoomLevel")
      ) {
        return
      }
      sessions.forEach((session) => {
        const scale = viewerScale(session.uri)
        void Promise.resolve(
          session.panel.webview.postMessage({ type: "setScale", scale } satisfies HostMessage),
        ).catch(() => {})
      })
    }),
  )

  return {
    open,
    reload,
    showDiagnostics,
    openInTaxonium,
    compareWithTree,
    addMetadata,
    showInputs,
    openNarrative,
    provider,
  }
}

export interface ViewerManager {
  readonly provider: CustomReadonlyEditorProvider
  open(uri?: Uri, selectedUris?: readonly Uri[]): Promise<void>
  reload(): Promise<void>
  showDiagnostics(): Promise<void>
  openInTaxonium(): Promise<void>
  compareWithTree(): Promise<void>
  addMetadata(): Promise<void>
  showInputs(): Promise<void>
  openNarrative(): Promise<void>
}

interface ViewerSession {
  readonly panel: WebviewPanel
  readonly uri: Uri
  readonly identity: string | undefined
  readonly diagnosticsKey: symbol
  reload(): Promise<void>
  openInTaxonium(): Promise<void>
  addMetadata(uris: readonly Uri[]): Promise<void>
  showInputs(): Promise<void>
  addSubscriptions(subscriptions: readonly Disposable[]): void
  isDisposed(): boolean
  dispose(): void
}

function createViewerSession(
  panel: WebviewPanel,
  uri: Uri,
  diagnosticsKey: symbol,
  updateDiagnostics: (diagnostics: readonly InputDiagnostic[]) => void,
  reloadWebview: () => void,
  initialComparisonUri?: Uri,
): ViewerSession {
  let requestedGeneration = 0
  let committedGeneration = 0
  let resourceDescriptors: readonly ResourceDescriptor[] = []
  let datasetDescriptors: readonly ResourceDescriptor[] = []
  let metadataUris: readonly Uri[] = []
  const comparisonUri = initialComparisonUri
  let narrativeDatasetUris: readonly Uri[] = []
  let disposed = false
  let loadQueue = Promise.resolve()
  let staleTask: Promise<void> | undefined
  const watcherSubscriptions: Disposable[] = []
  const subscriptions: Disposable[] = []

  function load(): Promise<void> {
    requestedGeneration += 1
    const generation = requestedGeneration
    void Promise.resolve(
      panel.webview.postMessage({ type: "supersede", generation } satisfies HostMessage),
    ).catch((error: unknown) => {
      reportAsyncError("cancel the previous load", error)
    })
    loadQueue = loadQueue.then(
      () => performLoad(generation),
      () => performLoad(generation),
    )
    return loadQueue
  }

  async function performLoad(generation: number): Promise<void> {
    const limitBytes = resourceLimitBytes(uri)
    try {
      const primaryUris = await resolveDatasetUris(uri)
      const comparisonUris =
        comparisonUri === undefined ? [] : await resolveDatasetUris(comparisonUri)
      const resourceUris = [...primaryUris, ...narrativeDatasetUris, ...comparisonUris]
      const resources = await Promise.all(
        resourceUris.map((resourceUri) => readResource(resourceUri, limitBytes)),
      )
      if (!isCurrent(generation)) return
      const message: HostMessage = {
        type: "load",
        generation,
        resources,
        resourceLimitBytes: limitBytes,
        largeTreeTipAdvisory: largeTreeTipAdvisory(uri),
        mapsEnabled: mapsEnabled(uri),
        sidebarInitialState: sidebarInitialState(uri),
        locale: auspiceLocale(),
      }
      committedGeneration = generation
      datasetDescriptors = resources.map((resource) => ({ uri: resource.uri, name: resource.name }))
      resourceDescriptors = [
        ...datasetDescriptors,
        ...metadataUris.map((metadataUri) => ({
          uri: metadataUri.toString(),
          name: basename(metadataUri.path),
        })),
      ]
      replaceWatchers()
      const delivered = await panel.webview.postMessage(message)
      if (!delivered && isCurrent(generation)) {
        resourceDescriptors = []
        updateDiagnostics([])
        throw new Error("The Auspice webview did not accept the dataset payload.")
      }
    } catch (error: unknown) {
      if (!isCurrent(generation)) return
      const message = error instanceof Error ? error.message : String(error)
      updateDiagnostics([{ uri, severity: "error", message }])
      await panel.webview.postMessage({ type: "hostError", message } satisfies HostMessage)
      await window.showErrorMessage(`Auspice: ${message}`)
    }
  }

  function isCurrent(generation: number): boolean {
    return !disposed && generation === requestedGeneration
  }

  async function handleMessage(unparsed: unknown): Promise<void> {
    const parsed = webviewMessageSchema.safeParse(unparsed)
    if (!parsed.success) {
      await panel.webview.postMessage({
        type: "hostError",
        message: "The viewer sent an invalid message.",
      } satisfies HostMessage)
      return
    }
    await routeMessage(parsed.data)
  }

  async function routeMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        await load()
        return
      case "reload":
        reloadWebview()
        return
      case "saveExport":
        await saveExport(message.filename, message.mediaType, message.content)
        return
      case "diagnostics":
        if (message.generation !== committedGeneration) return
        updateDiagnostics(
          message.diagnostics.flatMap((diagnostic) => {
            const descriptor = resourceDescriptors[diagnostic.resourceIndex]
            return descriptor === undefined
              ? []
              : [{ uri: VsCodeUri.parse(descriptor.uri), ...diagnostic }]
          }),
        )
        return
      case "loadComplete":
        if (message.generation !== committedGeneration) return
        await sendMetadata()
        await panel.webview.postMessage({ type: "stale", stale: false } satisfies HostMessage)
        return
      case "showDiagnostics":
        await commands.executeCommand("workbench.actions.view.problems")
        return
      case "openInTaxonium":
        await openInTaxonium()
        return
      case "requestNarrativeDatasets":
        {
          const resolution = await resolveNarrativeDatasetUris(uri, message.names)
          if (resolution.missingNames.length === 0) {
            narrativeDatasetUris = resolution.uris
          } else {
            const selected = await window.showOpenDialog({
              canSelectMany: true,
              openLabel: `Select ${resolution.missingNames.join(", ")}`,
              filters: {
                "Auspice or Newick tree": ["json", "auspicejson", "new", "nwk", "newick", "gz"],
              },
            })
            if (selected === undefined) {
              await panel.webview.postMessage({
                type: "hostError",
                message: `Narrative datasets are missing: ${resolution.missingNames.join(", ")}.`,
              } satisfies HostMessage)
              return
            }
            const selectedGroups = await Promise.all(selected.map(resolveDatasetUris))
            narrativeDatasetUris = [...resolution.uris, ...selectedGroups.flat()]
          }
        }
        await load()
        return
    }
  }

  async function openInTaxonium(): Promise<void> {
    const resourceDescriptor = resourceDescriptors.at(0)
    if (resourceDescriptor === undefined) return
    const action = await window.showInformationMessage(
      "Taxonium is an external service. Choose the local file manually after opening it; this extension never uploads data automatically.",
      "Copy file path",
      "Open Taxonium",
    )
    if (action === "Copy file path") {
      await env.clipboard.writeText(VsCodeUri.parse(resourceDescriptor.uri).fsPath)
    }
    if (action === "Open Taxonium") await env.openExternal(VsCodeUri.parse(TAXONIUM_URL))
  }

  async function addMetadata(uris: readonly Uri[]): Promise<void> {
    metadataUris = uris
    resourceDescriptors = [
      ...datasetDescriptors,
      ...metadataUris.map((metadataUri) => ({
        uri: metadataUri.toString(),
        name: basename(metadataUri.path),
      })),
    ]
    replaceWatchers()
    await sendMetadata()
  }

  async function sendMetadata(): Promise<void> {
    if (metadataUris.length === 0) return
    const limitBytes = resourceLimitBytes(uri)
    const resources = await Promise.all(
      metadataUris.map((metadataUri) => readResource(metadataUri, limitBytes)),
    )
    await panel.webview.postMessage({ type: "addMetadata", resources } satisfies HostMessage)
  }

  async function showInputs(): Promise<void> {
    const items = resourceDescriptors.map((resource) => ({
      label: resource.name,
      description: VsCodeUri.parse(resource.uri).fsPath,
    }))
    await window.showQuickPick(items, { placeHolder: "Files attached to this Auspice tab" })
  }

  function replaceWatchers(): void {
    watcherSubscriptions.splice(0).forEach((subscription) => {
      subscription.dispose()
    })
    resourceDescriptors.forEach((resource) => {
      const resourceUri = VsCodeUri.parse(resource.uri)
      if (resourceUri.scheme !== "file") return
      const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(
          VsCodeUri.file(dirname(resourceUri.fsPath)),
          basename(resourceUri.fsPath),
        ),
      )
      watcherSubscriptions.push(
        watcher,
        watcher.onDidChange(handleStaleEvent),
        watcher.onDidDelete(handleStaleEvent),
      )
    })
  }

  function handleStaleEvent(): void {
    if (staleTask !== undefined || disposed) return
    staleTask = handleStale().finally(() => {
      staleTask = undefined
    })
    void staleTask.catch((error: unknown) => {
      reportAsyncError("handle changed inputs", error)
    })
  }

  async function handleStale(): Promise<void> {
    const configured = workspace
      .getConfiguration("auspiceVscode", uri)
      .get<unknown>("staleFileBehavior")
    const behavior = configured === "ask" || configured === "keep" ? configured : "reload"
    if (behavior === "reload") {
      await load()
      return
    }
    await panel.webview.postMessage({ type: "stale", stale: true } satisfies HostMessage)
    if (behavior === "keep") return
    const action = await window.showInformationMessage(
      "The input for this Auspice view changed.",
      "Reload view",
      "Keep current view",
    )
    if (action === "Reload view") await load()
  }

  function reportAsyncError(action: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    void window.showErrorMessage(`Auspice could not ${action}: ${message}`)
  }

  subscriptions.push(
    panel.webview.onDidReceiveMessage((message) => {
      void handleMessage(message).catch((error: unknown) => {
        reportAsyncError("handle a viewer request", error)
      })
    }),
  )

  return {
    panel,
    uri,
    identity: v1Identity(uri),
    diagnosticsKey,
    reload(): Promise<void> {
      reloadWebview()
      return Promise.resolve()
    },
    openInTaxonium,
    addMetadata,
    showInputs,
    addSubscriptions(additionalSubscriptions): void {
      subscriptions.push(...additionalSubscriptions)
    },
    isDisposed(): boolean {
      return disposed
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      requestedGeneration += 1
      subscriptions.forEach((subscription) => {
        subscription.dispose()
      })
      watcherSubscriptions.forEach((subscription) => {
        subscription.dispose()
      })
    },
  }
}

async function saveExport(
  filename: string,
  mediaType: string,
  content: ArrayBuffer,
): Promise<void> {
  const destination = await window.showSaveDialog({
    defaultUri: VsCodeUri.file(basename(filename)),
    saveLabel: "Save Auspice export",
    filters: exportFilters(mediaType),
  })
  if (destination !== undefined) {
    await workspace.fs.writeFile(destination, new Uint8Array(content))
  }
}

function exportFilters(mediaType: string): Record<string, string[]> {
  if (mediaType.includes("svg")) return { "SVG image": ["svg"] }
  if (mediaType.includes("csv")) return { "CSV table": ["csv"] }
  if (mediaType.includes("json")) return { JSON: ["json"] }
  if (mediaType.includes("newick")) return { "Newick tree": ["nwk", "newick"] }
  return { "Text file": ["txt"] }
}

function mapsEnabled(uri: Uri): boolean {
  const configured = workspace.getConfiguration("auspiceVscode", uri).get<unknown>("mapsEnabled")
  return configured === true
}

function sidebarInitialState(uri: Uri): "open" | "closed" | "dataset" {
  const configured = workspace
    .getConfiguration("auspiceVscode", uri)
    .get<unknown>("sidebarInitialState")
  return configured === "closed" || configured === "dataset" ? configured : "open"
}

function auspiceLocale(): string {
  const locale = env.language.toLowerCase().split("-").at(0) ?? "en"
  return AUSPICE_LOCALES.has(locale) ? locale : "en"
}

function preserveBackgroundViews(uri?: Uri): boolean {
  const configured = workspace
    .getConfiguration("auspiceVscode", uri)
    .get<unknown>("preserveBackgroundViews")
  return typeof configured === "boolean" ? configured : true
}

// VS Code zooms webview content along with the editor (Electron zoom factor
// `1.2 ** window.zoomLevel`). Auspice sizes its panels in CSS pixels, so under a
// zoomed editor the phylogeny renders magnified and the logical viewport shrinks
// enough to trip Auspice's mobile breakpoint. The shell renders at the inverse
// scale so the viewer stays at true device resolution regardless of editor zoom.
function viewerScale(uri?: Uri): number {
  const configured = workspace.getConfiguration("auspiceVscode", uri).get<unknown>("zoom")
  if (typeof configured === "number" && configured > 0) return configured
  const zoomLevel = workspace.getConfiguration("window").get<unknown>("zoomLevel")
  const level = typeof zoomLevel === "number" ? zoomLevel : 0
  return 1 / 1.2 ** level
}

function largeTreeTipAdvisory(uri?: Uri): number {
  const configured = workspace
    .getConfiguration("auspiceVscode", uri)
    .get<unknown>("largeTreeTipAdvisory")
  return typeof configured === "number" && Number.isSafeInteger(configured) && configured >= 0
    ? configured
    : 5_000
}

function viewerTitle(uri: Uri): string {
  return basename(uri.path)
}

function v1Identity(uri: Uri): string | undefined {
  const value = uri.toString()
  return /_(?:meta|tree)\.json(?:\.(?:gz|gzip))?$/iu.test(value)
    ? value.replace(/_(?:meta|tree)\.json(?:\.(?:gz|gzip))?$/iu, "_v1-dataset")
    : undefined
}

interface ResourceDescriptor {
  readonly uri: string
  readonly name: string
}
