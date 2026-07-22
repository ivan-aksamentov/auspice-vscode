import type { ExtensionContext, Webview } from "vscode"
import { Uri } from "vscode"

import { CLIENT_BUNDLE_FILE, CLIENT_FAVICON_FILE, CLIENT_LOGO_FILE } from "./auspiceAssets.js"
import { renderWebviewHtml } from "./webviewHtml.js"

export interface WebviewOptions {
  readonly mapsEnabled: boolean
  readonly viewerScale: number
  readonly isCancelled: () => boolean
}

export function configureWebview(
  context: ExtensionContext,
  webview: Webview,
  options: WebviewOptions,
): void {
  const clientRoot = Uri.joinPath(context.extensionUri, "dist", "auspice-client")
  webview.options = {
    enableScripts: true,
    localResourceRoots: [clientRoot],
  }
  if (options.isCancelled()) return
  const nonce = crypto.randomUUID().replaceAll("-", "")
  webview.html = renderWebviewHtml({
    assets: {
      favicon: assetUri(webview, clientRoot, CLIENT_FAVICON_FILE),
      logo: assetUri(webview, clientRoot, CLIENT_LOGO_FILE),
      bundle: assetUri(webview, clientRoot, CLIENT_BUNDLE_FILE),
    },
    cspSource: webview.cspSource,
    mapsEnabled: options.mapsEnabled,
    nonce,
    viewerScale: options.viewerScale,
  })
}

function assetUri(webview: Webview, root: Uri, filename: string): string {
  return webview.asWebviewUri(Uri.joinPath(root, filename)).toString()
}
