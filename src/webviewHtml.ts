export function renderWebviewHtml(options: WebviewHtmlOptions): string {
  const mapSources = options.mapsEnabled
    ? " https://*.mapbox.com https://*.mapbox.cn https://*.openstreetmap.org"
    : ""
  const connectSources = options.mapsEnabled ? mapSources.trim() : "'none'"
  const csp = [
    "default-src 'none'",
    `img-src ${options.cspSource} data:${mapSources}`,
    `font-src ${options.cspSource} data:`,
    `style-src ${options.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${options.nonce}' 'strict-dynamic'`,
    `connect-src ${connectSources}`,
    "worker-src blob:",
  ].join("; ")
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <title>Auspice</title>
    <link rel="icon" href="${options.assets.favicon}" type="image/png">
    <style>
      html,
      body,
      #root {
        height: 100%;
        margin: 0;
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
    <div id="root" style="--auspice-viewer-scale: ${options.viewerScale}"><output class="auspice-loading"><img class="auspice-loading__logo" src="${options.assets.logo}" alt="Loading" width="96" height="96"></output></div>
    <script type="module" nonce="${options.nonce}" src="${options.assets.bundle}"></script>
  </body>
</html>`
}

export interface WebviewHtmlOptions {
  readonly assets: WebviewAssetUris
  readonly cspSource: string
  readonly mapsEnabled: boolean
  readonly nonce: string
  readonly viewerScale: number
}

export interface WebviewAssetUris {
  readonly favicon: string
  readonly logo: string
  readonly bundle: string
}
