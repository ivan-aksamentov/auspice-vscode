import { describe, expect, test } from "bun:test"

import { webviewMessageSchema } from "../../src/protocol"
import { renderWebviewHtml } from "../../src/webviewHtml"

describe("webview contract", () => {
  test("test_webview_html_disables_network_access_without_map_permission", () => {
    const actual = renderWebviewHtml({
      assets: testAssets,
      cspSource: "vscode-webview:",
      mapsEnabled: false,
      nonce: "test-nonce",
      viewerScale: 1,
    })

    // VS Code's webview security model requires explicit resource URIs and deny-by-default CSP.
    // Oracle: the SVG export fetches the Lato font from the `data:` URL that the bundle inlines
    // (`latoFontDefs()` in Auspice's `components/download/embedFont.js`), and nothing else.
    expect(actual).toContain("connect-src data:;")
    expect(actual).toContain('href="vscode-resource:/extension/favicon.png"')
    expect(actual).toContain(
      '<script type="module" nonce="test-nonce" src="vscode-resource:/extension/auspice-client.js"></script>',
    )
  })

  test("test_webview_html_loads_a_single_client_bundle", () => {
    const actual = renderWebviewHtml({
      assets: testAssets,
      cspSource: "vscode-webview:",
      mapsEnabled: false,
      nonce: "test-nonce",
      viewerScale: 1,
    })

    // The shell ships one bundle; the loader placeholder must be the only fallback.
    expect(actual.match(/<script /gu)).toHaveLength(1)
    expect(actual.match(/class="auspice-loading"/gu)).toHaveLength(1)
    // The placeholder shows the brand logo, matching the React splash it hands off to.
    expect(actual).toContain('src="vscode-resource:/extension/logo.png"')
  })

  test("test_webview_html_allows_only_configured_map_origins", () => {
    const actual = renderWebviewHtml({
      assets: testAssets,
      cspSource: "vscode-webview:",
      mapsEnabled: true,
      nonce: "test-nonce",
      viewerScale: 1,
    })

    // Auspice's default map style loads every tile, glyph and sprite from OpenFreeMap.
    expect(actual).toContain("connect-src data: https://tiles.openfreemap.org;")
    expect(actual).toContain("img-src vscode-webview: data: blob: https://tiles.openfreemap.org;")
  })

  test("test_webview_html_fills_the_editor_without_the_default_body_padding", () => {
    const actual = renderWebviewHtml({
      assets: testAssets,
      cspSource: "vscode-webview:",
      mapsEnabled: false,
      nonce: "test-nonce",
      viewerScale: 1,
    })

    // Oracle: VS Code's webview host styles `body { padding: 0 20px }` in the `vscode-default`
    // cascade layer (workbench/contrib/webview/browser/pre/index.html), which unlayered rules override
    expect(actual).toMatch(/body,\s*#root \{[^}]*padding: 0;/u)
  })

  test("test_webview_html_injects_viewer_scale_to_counteract_editor_zoom", () => {
    const actual = renderWebviewHtml({
      assets: testAssets,
      cspSource: "vscode-webview:",
      mapsEnabled: false,
      nonce: "test-nonce",
      viewerScale: 0.75,
    })

    // The shell reads this custom property to render at the inverse of the editor zoom.
    expect(actual).toContain('style="--auspice-viewer-scale: 0.75"')
  })

  test("test_webview_protocol_requires_generation_for_load_results", () => {
    const diagnostics = webviewMessageSchema.safeParse({ type: "diagnostics", diagnostics: [] })
    const loadComplete = webviewMessageSchema.safeParse({ type: "loadComplete" })

    expect({ diagnostics: diagnostics.success, loadComplete: loadComplete.success }).toEqual({
      diagnostics: false,
      loadComplete: false,
    })
  })
})

const testAssets = {
  favicon: "vscode-resource:/extension/favicon.png",
  logo: "vscode-resource:/extension/logo.png",
  bundle: "vscode-resource:/extension/auspice-client.js",
}
