export function renderWebviewHtml(options: WebviewHtmlOptions): string {
  const csp = webviewCsp(options)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <title>Auspice</title>
    <link rel="icon" href="${options.assets.favicon}" type="image/png">
    <style>
      /*
       * VS Code's default webview styles pad the body by 20 px on the left and
       * right (the \`vscode-default\` layer), which framed the viewer in a strip
       * of editor background. The viewer fills the whole editor.
       */
      html,
      body,
      #root {
        height: 100%;
        margin: 0;
        padding: 0;
      }

      /*
       * The loading screen. These rules live in the shell head, so they apply
       * to the pre-bundle placeholder below and, once the client bundle mounts
       * React, to its splash (ViewerSplash in the client), which renders the
       * same markup. Keeping one definition here means both phases show an
       * identical pulsing logo with no style jump when React takes over.
       */
      .auspice-loading {
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
      }

      .auspice-loading__logo {
        animation: auspice-vscode-pulse 1.6s ease-in-out infinite;
        height: 96px;
        width: 96px;
      }

      @keyframes auspice-vscode-pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }

        50% {
          opacity: 0.55;
          transform: scale(0.9);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .auspice-loading__logo {
          animation: none;
        }
      }
    </style>
  </head>
  <body>
    <div id="root" style="--auspice-viewer-scale: ${options.viewerScale}" data-basemap-base="${options.basemapBase}"><output class="auspice-loading"><img class="auspice-loading__logo" src="${options.assets.logo}" alt="Loading" width="96" height="96"></output></div>
    <script type="module" nonce="${options.nonce}" src="${options.assets.bundle}"></script>
  </body>
</html>`
}

/**
 * Return the Content Security Policy of the viewer webview. The page fetches only what the
 * extension ships: the SVG export embeds the Lato font from the `data:` URL that the client bundle
 * inlines, and the map loads its basemap files from the webview's own resources. MapLibre runs its
 * workers from `blob:` URLs.
 */
export function webviewCsp(options: WebviewCspOptions): string {
  return [
    "default-src 'none'",
    `img-src ${options.cspSource} data:`,
    `font-src ${options.cspSource} data:`,
    `style-src ${options.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${options.nonce}' 'strict-dynamic'`,
    `connect-src data: ${options.cspSource}`,
    "worker-src blob:",
  ].join("; ")
}

export interface WebviewHtmlOptions extends WebviewCspOptions {
  readonly assets: WebviewAssetUris
  /** Address of the directory of the basemap files of the map */
  readonly basemapBase: string
  readonly viewerScale: number
}

export interface WebviewCspOptions {
  /** Origin of the webview's own resources (`Webview.cspSource`) */
  readonly cspSource: string
  /** Nonce of the scripts that the page may run */
  readonly nonce: string
}

export interface WebviewAssetUris {
  readonly favicon: string
  readonly logo: string
  readonly bundle: string
}
