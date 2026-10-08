import { strict as assert } from "node:assert"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

import { chromium } from "@playwright/test"
import type { Page } from "@playwright/test"

import { CLIENT_BUNDLE_FILE } from "../src/auspiceAssets"

const contractDataset = {
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
}
// A tip label margin sized from the first tip (8 characters) cuts the longer names after it.
// Capital "W" is wider than the margin estimate per character, so the last label extends past the
// tree panel on screen and must stay complete in the SVG export.
const LONG_TIP_NAME = "HCoV_229E_Portugal_16_2026"
const WIDE_TIP_NAME = "W".repeat(20)
const tipLabelDataset = {
  version: "v2",
  meta: { title: "Tip label contract", panels: ["tree"] },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: [
      { name: "PZ086211", node_attrs: { div: 1 } },
      { name: LONG_TIP_NAME, node_attrs: { div: 1 } },
      { name: WIDE_TIP_NAME, node_attrs: { div: 1 } },
    ],
  },
}
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
  const { page, pageErrors } = await openViewer(contractDataset)
  await page.getByText("Color By", { exact: true }).waitFor()
  await page.locator('button[data-for="EditButton"]').waitFor()
  assert.equal(await page.locator(".mapboxgl-map").count(), 0)
  assert.deepEqual(pageErrors, [])

  const tipLabels = await openViewer(tipLabelDataset)
  await tipLabels.page.locator(".tipLabel", { hasText: WIDE_TIP_NAME }).waitFor()
  assert.deepEqual(await tipLabelsPastTreePanel(tipLabels.page), [WIDE_TIP_NAME])
  assert.deepEqual(await treeLabelsOutsideSvgExport(tipLabels.page), [])
  const downloads = await downloadsFromTreeButtons(tipLabels.page, ["SVG", "JSON", "NWK"])
  assert.deepEqual(
    downloads.map(({ filename }) => filename),
    ["view.svg", "view.json", "view_tree.nwk"],
  )
  assert.deepEqual(tipLabels.pageErrors, [])

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

async function openViewer(dataset: unknown): Promise<{ page: Page; pageErrors: string[] }> {
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
  await loadDataset(page, dataset, false)
  return { page, pageErrors }
}

/** Return the tip labels that extend past the right edge of the tree panel on screen */
function tipLabelsPastTreePanel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tree = document.getElementById("MainTree")
    const width = Number(tree?.getAttribute("width"))
    const right = (tree?.closest("svg")?.getBoundingClientRect().left ?? 0) + width
    return [...document.querySelectorAll("#MainTree .tipLabel")]
      .filter((label) => label.getBoundingClientRect().right > right)
      .map((label) => label.textContent ?? "")
  })
}

/**
 * Export the SVG screenshot and return the tree labels that are not fully visible in it: labels
 * outside the image, or outside the tree panel when the panel clips its content
 */
async function treeLabelsOutsideSvgExport(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    window.svgExports = []
    window.addEventListener("auspice-export", (event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined
      if (typeof detail === "object" && detail !== null && "content" in detail) {
        window.svgExports?.push(String(detail.content))
      }
    })
  })
  await page.getByRole("button", { name: "Download data" }).click()
  await page.getByRole("button", { name: /^Screenshot \(SVG\)/u }).click()
  await page.waitForFunction(() => (window.svgExports?.length ?? 0) > 0)
  // The "d" key toggles Auspice's download modal
  await page.keyboard.press("d")
  await page.getByRole("button", { name: /^Screenshot \(SVG\)/u }).waitFor({ state: "detached" })
  return page.evaluate(() => {
    const exported = new DOMParser().parseFromString(window.svgExports?.[0] ?? "", "image/svg+xml")
    const image = document.importNode(exported.documentElement, true)
    document.body.append(image)
    const imageRect = image.getBoundingClientRect()
    const [viewBoxX = 0, viewBoxY = 0] = (image.getAttribute("viewBox") ?? "")
      .split(" ")
      .map(Number)
    const panel = image.querySelector('svg[id="tree"]')
    const panelLeft = imageRect.left - viewBoxX + Number(panel?.getAttribute("x"))
    const panelTop = imageRect.top - viewBoxY + Number(panel?.getAttribute("y"))
    // Standalone SVG viewers clip a nested <svg> at its viewport unless it has overflow="visible"
    const bounds =
      panel?.getAttribute("overflow") === "visible"
        ? imageRect
        : {
            left: panelLeft,
            top: panelTop,
            right: panelLeft + Number(panel?.getAttribute("width")),
            bottom: panelTop + Number(panel?.getAttribute("height")),
          }
    const outside = [...image.querySelectorAll('svg[id="tree"] text')]
      .filter((label) => {
        const rect = label.getBoundingClientRect()
        return (
          rect.width > 0 &&
          getComputedStyle(label).visibility !== "hidden" &&
          (rect.left < bounds.left ||
            rect.right > bounds.right ||
            rect.top < bounds.top ||
            rect.bottom > bounds.bottom)
        )
      })
      .map((label) => label.textContent ?? "")
    image.remove()
    return outside
  })
}

/** Press download buttons of the tree panel and return the downloaded files */
async function downloadsFromTreeButtons(
  page: Page,
  buttons: readonly string[],
): Promise<{ filename: string; content: string }[]> {
  await page.evaluate(() => {
    window.treeButtonDownloads = []
    window.addEventListener("auspice-export", (event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined
      if (
        typeof detail === "object" &&
        detail !== null &&
        "filename" in detail &&
        "content" in detail
      ) {
        window.treeButtonDownloads?.push({
          filename: String(detail.filename),
          content: String(detail.content),
        })
      }
    })
  })
  for (const [index, name] of buttons.entries()) {
    await page.getByRole("button", { name, exact: true }).click()
    await page.waitForFunction(
      (count) => (window.treeButtonDownloads?.length ?? 0) >= count,
      index + 1,
    )
  }
  return page.evaluate(() => window.treeButtonDownloads ?? [])
}

async function loadDataset(page: Page, dataset: unknown, mapsEnabled: boolean): Promise<void> {
  const content = JSON.stringify(dataset)
  await page.evaluate(
    ({ datasetJson, showMaps }) => {
      const bytes = new TextEncoder().encode(datasetJson).buffer
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
    { datasetJson: content, showMaps: mapsEnabled },
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
    svgExports?: string[]
    treeButtonDownloads?: { filename: string; content: string }[]
  }
}
