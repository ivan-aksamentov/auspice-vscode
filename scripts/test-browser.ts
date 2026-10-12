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
// Capital "W" is wider than an estimate from the number of characters, so the margin must come from
// the rendered width of the labels.
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
// Auspice computes the genetic diversity (entropy) bars when the dataset loads, and afterwards only
// while that panel is on screen. Below the tree, the panel starts below the fold, so zooming into
// the clade "AB" clears the bars and the panel shows "data loading".
const entropyDataset = {
  version: "v2",
  meta: {
    title: "Entropy export contract",
    panels: ["tree", "entropy"],
    genome_annotations: {
      nuc: { start: 1, end: 60, strand: "+" },
      S: { start: 1, end: 60, strand: "+" },
    },
  },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: [
      {
        name: "AB",
        node_attrs: { div: 1 },
        children: [
          { name: "A", node_attrs: { div: 2 }, branch_attrs: { mutations: { nuc: ["A10G"] } } },
          { name: "B", node_attrs: { div: 2 }, branch_attrs: { mutations: { nuc: ["C20T"] } } },
        ],
      },
      { name: "C", node_attrs: { div: 1 }, branch_attrs: { mutations: { nuc: ["G30A"] } } },
    ],
  },
}
// Branch labels end just before their node, so the label of a branch next to the root extends
// towards the left edge of the panel. The divergence axis also puts grid labels at both ends.
const ROOT_BRANCH_LABEL = "Long clade label next to the root"
const branchLabelDataset = {
  version: "v2",
  meta: {
    title: "Branch label contract",
    panels: ["tree"],
    display_defaults: { branch_label: "clade" },
  },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: [
      {
        name: "near_root",
        node_attrs: { div: 0.002 },
        branch_attrs: { labels: { clade: ROOT_BRANCH_LABEL } },
        children: [
          { name: "tip_A", node_attrs: { div: 0.14 } },
          { name: "tip_B", node_attrs: { div: 0.12 } },
        ],
      },
      { name: "tip_C", node_attrs: { div: 0.1 } },
    ],
  },
}
// A tree with short tip names, for a tanglegram with the tip label dataset
const shortNameDataset = {
  version: "v2",
  meta: { title: "Short names", panels: ["tree"] },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: ["A", "B", "C"].map((name) => ({ name, node_attrs: { div: 1 } })),
  },
}
// A time tree whose tip names are long enough to leave little room for the time axis
const timeTreeDataset = {
  version: "v2",
  meta: { title: "Narrow time axis", panels: ["tree"] },
  tree: {
    name: "root",
    node_attrs: { num_date: { value: 2000 }, div: 0 },
    children: [
      { name: LONG_TIP_NAME, node_attrs: { num_date: { value: 2020 }, div: 1 } },
      { name: `${LONG_TIP_NAME}_B`, node_attrs: { num_date: { value: 2010 }, div: 1 } },
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
const scenarios: readonly Scenario[] = [
  {
    name: "renders the controls and leaves out the map while maps are off",
    async run() {
      const { page, pageErrors, consoleTimers } = await openViewer(contractDataset)
      await page.getByText("Color By", { exact: true }).waitFor()
      await page.locator('button[data-for="EditButton"]').waitFor()
      assert.equal(await page.locator(".leaflet-container").count(), 0)
      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleTimers, [])
    },
  },
  {
    name: "keeps long tip labels in the SVG export and names the downloads",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset)
      await page.locator(".tipLabel", { hasText: WIDE_TIP_NAME }).waitFor()
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page), [])
      assert.deepEqual(await treeLabelsOutsideSvgExport(page), [])
      const downloads = await downloadsFromTreeButtons(page, ["SVG", "JSON", "NWK"])
      assert.deepEqual(
        downloads.map(({ filename }) => filename),
        ["view.svg", "view.json", "view_tree.nwk"],
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "exports the genetic diversity bars of a panel below the fold",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset)
      await page.locator("#d3entropyParent").waitFor()
      await zoomIntoClade(page, "AB")
      await page.locator("#d3entropyParent").getByText("data loading").waitFor()
      assert.equal(await page.locator("#d3entropyParent").getByText("data loading").count(), 1)
      const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
      assert.equal(svgExport?.content.includes('<svg id="entropy"'), true)
      assert.equal(svgExport?.content.includes("data loading"), false)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "draws the date grid of a time tree narrower than one grid interval",
    async run() {
      // Long tip names leave the time axis of a narrow tree panel shorter than the minimum
      // spacing of date grid lines (130 px). Auspice then divided the time range by zero grid
      // intervals and stepped towards an unreachable date, which froze the page.
      const { page, pageErrors } = await openViewer(timeTreeDataset, {
        viewport: { width: 560, height: 600 },
      })
      await page.locator("#MainTree .tipLabel").getByText(LONG_TIP_NAME, { exact: true }).waitFor()
      const axisWidth = await page.evaluate(() => {
        const tips = [...document.querySelectorAll("#MainTree .tip")].map(
          (tip) => tip.getBoundingClientRect().left,
        )
        return Math.max(...tips) - Math.min(...tips)
      })
      assert.ok(axisWidth < 130, `time axis is ${axisWidth} px wide`)
      assert.ok((await page.locator("#MainTree .gridText").count()) > 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "redraws the tree at once when its panel changes size",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      // Auspice skips the animation of updates requested within 1.4 s of the previous one
      await page.waitForTimeout(1_500)
      await page.setViewportSize({ width: 800, height: 900 })
      // Auspice animates tree changes for 700 ms. Tips that move from positions computed for the
      // wider panel would stay outside the narrower SVG for most of that time.
      await page.waitForTimeout(150)
      assert.deepEqual(await tipsOutsideTreeSvg(page), [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "fits branch labels near the root and the outermost axis labels inside the tree panel",
    async run() {
      const { page, pageErrors } = await openViewer(branchLabelDataset)
      await page.locator("#MainTree .branchLabel").getByText(ROOT_BRANCH_LABEL).waitFor()
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page), [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "clips each tree of a tanglegram to its own panel",
    async run() {
      // The tip label margin of each tree follows its own labels, so the mirrored second tree,
      // whose names are short, extends further towards its root side than the first tree
      const { page, pageErrors } = await openViewer(tipLabelDataset, {
        secondDataset: shortNameDataset,
      })
      await page.locator("#SecondTree .tip").first().waitFor()
      assert.deepEqual(await branchesOutsideTheirClip(page, "SecondTree"), [])
      assert.deepEqual(await branchesOutsideTheirClip(page, "MainTree"), [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "switches branch labels and panel options by keyboard",
    async run() {
      const { page, pageErrors } = await openViewer({
        ...branchLabelDataset,
        meta: { ...branchLabelDataset.meta, display_defaults: { branch_label: "none" } },
      })
      const branchLabels = page.getByRole("combobox", { name: "Branch Labels" })
      await branchLabels.focus()
      await page.keyboard.press("ArrowDown")
      await page.getByRole("option", { name: "clade", exact: true }).waitFor()
      await page.keyboard.press("ArrowDown")
      await page.keyboard.press("Enter")
      await page.locator("#MainTree .branchLabel").getByText(ROOT_BRANCH_LABEL).waitFor()
      // The new labels widen the margin on the root side, which moves the whole tree
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page), [])

      const showAllLabels = page.getByRole("checkbox", { name: "Show all labels" })
      await showAllLabels.focus()
      await page.keyboard.press("Space")
      assert.equal(await showAllLabels.isChecked(), true)

      const treeOptions = page.getByRole("button", { name: "Tree options" })
      assert.equal(await treeOptions.getAttribute("aria-expanded"), "true")
      await treeOptions.focus()
      await page.keyboard.press("Enter")
      assert.equal(await treeOptions.getAttribute("aria-expanded"), "false")
      await branchLabels.waitFor({ state: "detached" })

      const treePanel = page.getByRole("checkbox", { name: "Show Tree panel" })
      await treePanel.focus()
      await page.keyboard.press("Space")
      await page.locator("#MainTree").waitFor({ state: "detached" })
      assert.deepEqual(pageErrors, [])
    },
  },
]
try {
  for (const scenario of scenarios) {
    try {
      await scenario.run()
    } catch (error: unknown) {
      throw new Error(`Browser scenario failed: ${scenario.name}`, { cause: error })
    }
  }
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

async function openViewer(
  dataset: unknown,
  { viewport = { width: 1_400, height: 900 }, secondDataset }: ViewerOptions = {},
): Promise<OpenViewer> {
  const page = await browser.newPage({ viewport })
  const pageErrors: string[] = []
  const consoleTimers: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.text().startsWith("Timer ")) consoleTimers.push(message.text())
  })
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
  const resources = [
    { name: "browser.auspice.json", content: dataset },
    ...(secondDataset === undefined
      ? []
      : [{ name: "second.auspice.json", content: secondDataset }]),
  ]
  await loadDatasets(page, resources, false)
  return { page, pageErrors, consoleTimers }
}

interface Scenario {
  readonly name: string
  run(): Promise<void>
}

interface ViewerOptions {
  readonly viewport?: { readonly width: number; readonly height: number }
  /** Dataset shown as the second tree of a tanglegram */
  readonly secondDataset?: unknown
}

interface OpenViewer {
  readonly page: Page
  readonly pageErrors: string[]
  readonly consoleTimers: string[]
}

/** Return the names of the tips whose circles lie outside the main tree SVG */
function tipsOutsideTreeSvg(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const svg = document.getElementById("MainTree")?.closest("svg")?.getBoundingClientRect()
    if (svg === undefined) return ["(no tree)"]
    return [...document.querySelectorAll("#MainTree .tip")]
      .filter((tip) => {
        const rect = tip.getBoundingClientRect()
        return rect.left < svg.left || rect.right > svg.right
      })
      .map((tip) => tip.id)
  })
}

/**
 * Return the branches of a tree that extend past the clip rectangle their group refers to. A branch
 * outside the rectangle of its own tree is cut on screen.
 */
function branchesOutsideTheirClip(page: Page, treeId: string): Promise<string[]> {
  return page.evaluate((id) => {
    const tolerancePx = 0.5
    return [...document.querySelectorAll(`#${id} .branch`)]
      .filter((branch) => {
        const group = branch.closest("[clip-path]")
        const clipId = /url\("?#(?<id>[^")]+)"?\)/u.exec(group?.getAttribute("clip-path") ?? "")
          ?.groups?.["id"]
        const rect =
          clipId === undefined ? null : document.getElementById(clipId)?.querySelector("rect")
        const matrix = group instanceof SVGGraphicsElement ? group.getScreenCTM() : null
        if (rect === null || rect === undefined || matrix === null) return false
        const left = new DOMPoint(Number(rect.getAttribute("x")), 0).matrixTransform(matrix).x
        const right = new DOMPoint(
          Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
          0,
        ).matrixTransform(matrix).x
        const box = branch.getBoundingClientRect()
        return box.width > 0 && (box.left < left - tolerancePx || box.right > right + tolerancePx)
      })
      .map((branch) => branch.id)
  }, treeId)
}

/**
 * Return the visible labels of the main tree that are not completely shown on screen: labels that
 * extend past the tree SVG, or past the clip path of their group
 */
function treeLabelsOutsideTreeSvg(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tree = document.getElementById("MainTree")
    const svg = tree?.closest("svg")?.getBoundingClientRect()
    if (tree === null || svg === undefined) return ["(no tree)"]
    const tolerancePx = 0.5
    return [...tree.querySelectorAll("text")]
      .filter((label) => {
        const rect = label.getBoundingClientRect()
        if (rect.width === 0 || getComputedStyle(label).visibility === "hidden") return false
        const bounds = [svg, clipBounds(label)].filter((box) => box !== undefined)
        return bounds.some(
          (box) =>
            rect.left < box.left - tolerancePx ||
            rect.right > box.right + tolerancePx ||
            rect.top < box.top - tolerancePx ||
            rect.bottom > box.bottom + tolerancePx,
        )
      })
      .map((label) => label.textContent ?? "")

    /** Return the screen box of the clip rectangle of the group that clips the element, if any */
    function clipBounds(
      element: Element,
    ): { left: number; right: number; top: number; bottom: number } | undefined {
      const group = element.closest("[clip-path]")
      const clipId = /url\("?#(?<id>[^")]+)"?\)/u.exec(group?.getAttribute("clip-path") ?? "")
        ?.groups?.["id"]
      const rect =
        clipId === undefined ? null : document.getElementById(clipId)?.querySelector("rect")
      const matrix = group instanceof SVGGraphicsElement ? group.getScreenCTM() : null
      if (rect === null || rect === undefined || matrix === null) return undefined
      // Clip paths use the user space of the clipped group, and their own boxes are not rendered
      const x = Number(rect.getAttribute("x"))
      const y = Number(rect.getAttribute("y"))
      const topLeft = new DOMPoint(x, y).matrixTransform(matrix)
      const bottomRight = new DOMPoint(
        x + Number(rect.getAttribute("width")),
        y + Number(rect.getAttribute("height")),
      ).matrixTransform(matrix)
      return { left: topLeft.x, right: bottomRight.x, top: topLeft.y, bottom: bottomRight.y }
    }
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

/** Zoom the main tree into a clade by clicking its branch */
async function zoomIntoClade(page: Page, name: string): Promise<void> {
  await page.evaluate((clade) => {
    // D3 binds each branch element to its tree node as `__data__`
    const branch = [...document.querySelectorAll("#MainTree .branch.S")].find((element) => {
      const data: unknown = Reflect.get(element, "__data__")
      if (typeof data !== "object" || data === null || !("n" in data)) return false
      const node: unknown = data.n
      return typeof node === "object" && node !== null && "name" in node && node.name === clade
    })
    if (branch instanceof SVGElement) branch.dataset["testid"] = "zoom-branch"
  }, name)
  await page.getByTestId("zoom-branch").click()
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

async function loadDatasets(
  page: Page,
  datasets: readonly { readonly name: string; readonly content: unknown }[],
  mapsEnabled: boolean,
): Promise<void> {
  const files = datasets.map(({ name, content }) => ({ name, json: JSON.stringify(content) }))
  await page.evaluate(
    ({ datasetFiles, showMaps }) => {
      const resources = datasetFiles.map(({ name, json }) => ({
        uri: `file:///${name}`,
        name,
        bytes: new TextEncoder().encode(json).buffer,
      }))
      window.postMessage(
        {
          type: "load",
          generation: 1,
          resources,
          resourceLimitBytes: 1_000_000,
          largeTreeTipAdvisory: 0,
          mapsEnabled: showMaps,
          sidebarInitialState: "open",
          locale: "en",
        },
        "*",
      )
    },
    { datasetFiles: files, showMaps: mapsEnabled },
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
