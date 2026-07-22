import { strict as assert } from "node:assert"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

import { chromium } from "@playwright/test"
import type { Page } from "@playwright/test"

import { CLIENT_BUNDLE_FILE } from "../src/auspiceAssets"

const extensionRoot = resolve(import.meta.dirname, "..")
const bundle = Bun.file(resolve(extensionRoot, "dist", "auspice-client", CLIENT_BUNDLE_FILE))
const browserPath =
  process.env["BROWSER"] ??
  ["chromium-browser", "chromium", "google-chrome"]
    .map(commandPath)
    .find((path) => path !== undefined)
if (browserPath === undefined || browserPath === "") {
  throw new Error("BROWSER must name a Chromium executable for webview rendering tests.")
}

function commandPath(command: string): string | undefined {
  const result = spawnSync("which", [command], { encoding: "utf8" })
  const path = result.stdout.trim()
  return result.status === 0 && path !== "" ? path : undefined
}

const server = Bun.serve({
  port: 0,
  routes: {
    "/": new Response(browserHtml(), { headers: { "Content-Type": "text/html" } }),
    [`/${CLIENT_BUNDLE_FILE}`]: new Response(bundle, {
      headers: { "Content-Type": "text/javascript" },
    }),
  },
})
const browser = await chromium.launch({ executablePath: browserPath, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1_400, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url())
    await (requestUrl.origin === server.url.origin ? route.continue() : route.abort())
  })
  await page.goto(server.url.toString())
  await page.waitForFunction(
    () =>
      window.viewerMessages?.some(
        (value) =>
          typeof value === "object" && value !== null && "type" in value && value.type === "ready",
      ) === true,
  )
  await loadDataset(page, false)
  await page.getByText("Color By", { exact: true }).waitFor()
  await page.locator('button[data-for="EditButton"]').waitFor()
  assert.equal(await page.locator(".mapboxgl-map").count(), 0)
  assert.deepEqual(pageErrors, [])
} finally {
  await browser.close()
  await server.stop(true)
}

function browserHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><style>html,body,#root{width:100%;height:100%;margin:0}</style></head>
  <body>
    <div id="root"></div>
    <script>
      window.viewerMessages = [];
      window.acquireVsCodeApi = () => ({ postMessage: (message) => window.viewerMessages.push(message) });
    </script>
    <script type="module" src="/${CLIENT_BUNDLE_FILE}"></script>
  </body>
</html>`
}

async function loadDataset(page: Page, mapsEnabled: boolean): Promise<void> {
  const content = JSON.stringify({
    version: "v2",
    meta: {
      title: "Browser rendering contract",
      panels: ["tree", "map"],
      colorings: [{ key: "country", title: "Country", type: "categorical" }],
      geo_resolutions: [
        { key: "country", demes: { Switzerland: { latitude: 46.8, longitude: 8.2 } } },
      ],
    },
    tree: {
      name: "root",
      node_attrs: { div: 0, country: { value: "Switzerland" } },
      children: [
        { name: "A", node_attrs: { div: 1, country: { value: "Switzerland" } } },
        { name: "B", node_attrs: { div: 1, country: { value: "Switzerland" } } },
      ],
    },
  })
  await page.evaluate(
    ({ dataset, showMaps }) => {
      const bytes = new TextEncoder().encode(dataset).buffer
      window.postMessage(
        {
          type: "load",
          generation: 1,
          resources: [{ uri: "file:///browser.auspice.json", name: "browser.auspice.json", bytes }],
          resourceLimitBytes: 1_000_000,
          largeTreeTipAdvisory: 0,
          mapsEnabled: showMaps,
          sidebarInitialState: "open",
          locale: "en",
        },
        "*",
      )
    },
    { dataset: content, showMaps: mapsEnabled },
  )
  await page.waitForFunction(
    () =>
      window.viewerMessages?.some(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          "type" in value &&
          value.type === "loadComplete",
      ) === true,
  )
}

declare global {
  interface Window {
    viewerMessages?: readonly unknown[]
  }
}
