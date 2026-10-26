import { strict as assert } from "node:assert"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

import { chromium } from "@playwright/test"
import type { Page } from "@playwright/test"
import { z } from "zod"

import { CLIENT_BASEMAP_DIRECTORY, CLIENT_BUNDLE_FILE } from "../src/auspiceAssets"
import { webviewCsp } from "../src/webviewHtml"

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
// A GISAID dataset whose tips have authors and GISAID accessions
const gisaidDataset = {
  version: "v2",
  meta: { title: "GISAID downloads", panels: ["tree"], data_provenance: [{ name: "GISAID" }] },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: [
      {
        name: "A",
        node_attrs: {
          div: 1,
          author: { value: "Smith et al", title: "A study", journal: "A journal" },
          gisaid_epi_isl: { value: "EPI_ISL_1" },
          originating_lab: { value: "Originating lab" },
        },
      },
      {
        name: "B",
        node_attrs: {
          div: 1,
          author: { value: "Smith et al", title: "A study", journal: "A journal" },
          gisaid_epi_isl: { value: "EPI_ISL_2" },
        },
      },
    ],
  },
}
// A Nextclade output tree: a dated reference tree with a placed sequence ("placed") that has no date
const partlyDatedDataset = {
  version: "v2",
  meta: { title: "Partly dated tree", panels: ["tree"] },
  tree: {
    name: "root",
    node_attrs: { div: 0, num_date: { value: 2000 } },
    children: [
      { name: "dated_A", node_attrs: { div: 1, num_date: { value: 2010 } } },
      { name: "dated_B", node_attrs: { div: 2, num_date: { value: 2015 } } },
      { name: "placed", node_attrs: { div: 1.5 } },
    ],
  },
}
// Two trees with the same genome annotation and a mutation at base 10, colored by that base
const genotypeDataset = {
  version: "v2",
  meta: {
    title: "Genotype colors of two trees",
    panels: ["tree"],
    display_defaults: { color_by: "gt-nuc_10" },
    genome_annotations: { nuc: { start: 1, end: 60, strand: "+" } },
  },
  tree: {
    name: "root",
    node_attrs: { div: 0 },
    children: [
      { name: "A", node_attrs: { div: 1 }, branch_attrs: { mutations: { nuc: ["A10G"] } } },
      { name: "B", node_attrs: { div: 1 } },
      { name: "C", node_attrs: { div: 1 } },
    ],
  },
}
// Coordinates where the digits of latitude and longitude together are the same ("1" and "23",
// "12" and "3"), and a row without coordinates
const SPLIT_COORDINATES_CSV = `strain,latitude,longitude
A,1,23
B,12,3
C,,
`
// The basemap files that a map loads
const BASEMAP_FILES = [
  "/basemap/countries.json",
  "/basemap/borders.json",
  "/basemap/labels.json",
  "/basemap/fonts/Noto%20Sans%20Bold/0-255.pbf",
]
// Coordinates of the tips of the entropy dataset, which has no map
const COORDINATES_CSV = `strain,latitude,longitude
A,46.8,8.2
B,46.8,8.2
C,52.5,13.4
`
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
// A narrative of the tip label dataset, which the viewer names "flu" after its file
const NARRATIVE = `---
title: Local narrative
authors: "Author"
date: "October 2026"
dataset: "https://nextstrain.org/flu?d=tree"
abstract: "The abstract."
---

# [First slide](https://nextstrain.org/flu?d=tree)

The first slide.
`
// A slide without a panel query (`d=`) shows the panels that the dataset shows by default
const PANEL_FREE_NARRATIVE = `---
title: Narrative without panel queries
authors: "Author"
date: "October 2026"
dataset: "https://nextstrain.org/entropy"
abstract: "The abstract."
---

# [First slide](https://nextstrain.org/entropy)

The first slide.
`
// The branch label dataset as a time tree with long tip names, which the clock and scatter layouts
// plot against dates
const datedBranchLabelDataset = {
  ...branchLabelDataset,
  meta: { ...branchLabelDataset.meta, title: "Dated branch label contract" },
  tree: {
    name: "root",
    node_attrs: { div: 0, num_date: { value: 2000 } },
    children: [
      {
        name: "near_root",
        node_attrs: { div: 0.002, num_date: { value: 2001 } },
        branch_attrs: { labels: { clade: ROOT_BRANCH_LABEL } },
        children: [
          { name: `${LONG_TIP_NAME}_A`, node_attrs: { div: 0.14, num_date: { value: 2020 } } },
          { name: `${LONG_TIP_NAME}_B`, node_attrs: { div: 0.12, num_date: { value: 2018 } } },
        ],
      },
      { name: `${LONG_TIP_NAME}_C`, node_attrs: { div: 0.1, num_date: { value: 2015 } } },
    ],
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
const clientRoot = resolve(extensionRoot, "dist", "auspice-client")
const bundle = Bun.file(resolve(clientRoot, CLIENT_BUNDLE_FILE))
const basemapRoot = resolve(clientRoot, CLIENT_BASEMAP_DIRECTORY)
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
    "/": () => browserPage(),
    [`/${CLIENT_BASEMAP_DIRECTORY}/*`]: (request) => basemapFile(new URL(request.url)),
    [`/${CLIENT_BUNDLE_FILE}`]: new Response(bundle, {
      headers: { "Content-Type": "text/javascript" },
    }),
  },
})
const browser = await chromium.launch({ executablePath: browserPath, headless: true })
const scenarios: readonly Scenario[] = [
  {
    name: "renders the controls and leaves out the map without WebGL",
    async run() {
      const { page, pageErrors, consoleTimers } = await openViewer(contractDataset, {
        panels: "dataset",
        webgl: false,
      })
      await page.getByText("Color By", { exact: true }).waitFor()
      await page.locator('button[data-for="EditButton"]').waitFor()
      assert.equal(await page.locator(".leaflet-container").count(), 0)
      // Auspice text is set in Lato, which the bundle carries along with Auspice's stylesheets
      const loadedFaces = await page.evaluate(async () => {
        await document.fonts.ready
        return [...document.fonts]
          .filter((face) => face.status === "loaded")
          .map((face) => `${face.family.replaceAll('"', "")} ${face.weight}`)
      })
      assert.ok(loadedFaces.includes("Lato 400"), `loaded font faces: ${loadedFaces.join(", ")}`)
      assert.equal(
        await page.evaluate(() => getComputedStyle(document.documentElement).fontSize),
        "10px",
      )
      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleTimers, [])
    },
  },
  {
    name: "keeps the options of sidebar selects dark in a dark editor theme",
    async run() {
      const { page, pageErrors } = await openViewer(branchLabelDataset)
      // VS Code's webview styles set the body text to the editor foreground, which is light in a
      // dark theme (`--vscode-foreground` of Dark Modern)
      await page.addStyleTag({ content: "body { color: #cccccc; }" })
      const branchLabels = page.getByRole("combobox", { name: "Branch Labels" })
      await branchLabels.focus()
      await page.keyboard.press("ArrowDown")
      // The selected option is white on blue, as react-select draws it
      const option = page.getByRole("option", { selected: false }).first()
      await option.waitFor()
      // Oracle: the sidebar of the light theme writes black text on its light background
      assert.equal(
        await option.evaluate((element) => getComputedStyle(element).color),
        "rgb(0, 0, 0)",
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "keeps long tip labels in the SVG export and names the downloads",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset)
      await page.locator(".tipLabel", { hasText: WIDE_TIP_NAME }).waitFor()
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page), [])
      assert.deepEqual(await treeLabelsOutsideSvgExport(page), [])
      const downloads = await downloadsFromTreeButtons(page, ["SVG", "JSON", "NWK", "TSV"])
      assert.deepEqual(
        downloads.map(({ filename }) => filename),
        ["view.svg", "view.json", "view_tree.nwk", "view_metadata.tsv"],
      )
      // The export embeds Lato, which it fetches from the font's `data:` URL under the webview CSP
      assert.ok(downloads[0]?.content.includes("@font-face") === true, "the SVG embeds no font")
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "offers the author and acknowledgment downloads of a GISAID dataset",
    async run() {
      const { page, pageErrors } = await openViewer(gisaidDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      // Oracle: Auspice's sharing rules withhold the dataset and the metadata of GISAID data and
      // offer its acknowledgments (`computeMetadataSharing()`), and offer the authors where tips
      // have authors (`areAuthorsPresent()`)
      const labels = await page.locator(".auspice-vscode-tree-download").allTextContents()
      assert.deepEqual(labels, ["SVG", "NWK", "Authors TSV", "Acknowledgments TSV"])
      const [authors, acknowledgments] = await downloadsFromTreeButtons(page, [
        "Authors TSV",
        "Acknowledgments TSV",
      ])
      assert.equal(authors?.filename, "view_authors.tsv")
      assert.equal(
        authors?.content.split("\n")[0],
        "Author\tn (strains)\tpublication title\tjournal\tpublication URL\tstrains",
      )
      assert.ok(authors?.content.includes("Smith et al\t2\tA study\tA journal"))
      assert.equal(acknowledgments?.filename, "view_acknowledgements.tsv")
      assert.ok(acknowledgments?.content.includes("EPI_ISL_1"))
      assert.ok(acknowledgments?.content.includes("Originating lab"))
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "writes a local caption below the SVG export and opens no download modal",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset)
      await page.getByRole("link", { name: /^Auspice v/u }).waitFor()
      const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
      const content = svgExport?.content ?? ""
      assert.ok(content.includes("Tip label contract"), "the caption has no dataset title")
      assert.ok(content.includes("Made with Auspice"), "the caption does not name the viewer")
      // Auspice stores the update date of a dataset without one as ""
      assert.equal(content.includes("Last updated"), false, "the caption has an empty date")
      // The dataset has no genome annotations, so it has no diversity data
      assert.equal(await page.getByRole("button", { name: "Entropy TSV" }).count(), 0)
      // Auspice's caption names the page address, nextstrain.org's data use and a license, and a
      // dataset without an update date as "undefined"
      for (const text of [
        "nextstrain.org",
        "CC-BY",
        "undefined",
        "vscode-webview",
        server.url.host,
      ]) {
        assert.equal(content.includes(text), false, `the SVG export contains "${text}"`)
      }
      // The fine print has no link to the download modal, and its key opens nothing
      assert.equal(await page.getByRole("button", { name: "Download data" }).count(), 0)
      await page.keyboard.press("d")
      await nextFrames(page)
      assert.equal(await page.getByText("Data usage policy").count(), 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "exports the genetic diversity bars of a panel below the fold",
    async run() {
      // Auspice gives the tree 88 % of the panel area, so in a short view the entropy panel
      // starts below the dataset header and the tree
      const { page, pageErrors } = await openViewer(entropyDataset, {
        panels: "dataset",
        viewport: { width: 1_400, height: 380 },
      })
      await page.locator("#d3entropyParent").waitFor({ state: "attached" })
      const { entropyTop, areaBottom } = await page.evaluate(() => ({
        entropyTop: document.getElementById("d3entropyParent")?.getBoundingClientRect().top,
        areaBottom: document.querySelector(".auspice-vscode-panels-scroll")?.getBoundingClientRect()
          .bottom,
      }))
      assert.ok(
        entropyTop !== undefined && areaBottom !== undefined && entropyTop > areaBottom,
        `the entropy panel starts at ${entropyTop}, the panel area ends at ${areaBottom}`,
      )
      await zoomIntoClade(page, "AB")
      await page.locator("#d3entropyParent").getByText("data loading").waitFor()
      assert.equal(await page.locator("#d3entropyParent").getByText("data loading").count(), 1)
      const [svgExport, entropyExport] = await downloadsFromTreeButtons(page, [
        "SVG",
        "Entropy TSV",
      ])
      assert.equal(svgExport?.content.includes('<svg id="entropy"'), true)
      assert.equal(svgExport?.content.includes("data loading"), false)
      // Oracle: in the clade "AB", one of the two tips has a mutation at base 10 and the other at
      // base 20 (`entropyDataset`), so each base has the Shannon entropy ln 2 = 0.693, which is
      // the diversity measure that Auspice shows by default
      assert.equal(entropyExport?.filename, "view_diversity.tsv")
      assert.equal(entropyExport?.content, "base\tentropy\n10\t0.693\n20\t0.693")
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "draws the date grid of a time tree narrower than one grid interval",
    async run() {
      // Long tip names leave the time axis of a narrow tree panel shorter than the minimum
      // spacing of date grid lines (130 px). Auspice then divided the time range by zero grid
      // intervals and stepped towards an unreachable date, which froze the page. In a viewer this
      // narrow, the sidebar lies closed over the panels, so the tree takes the whole width.
      const { page, pageErrors } = await openViewer(timeTreeDataset, {
        viewport: { width: 300, height: 600 },
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
  {
    name: "starts with only the tree and turns on another panel from the sidebar",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      assert.equal(await page.locator("#d3entropyParent").count(), 0)
      assert.equal(await page.getByRole("checkbox", { name: "Show Tree panel" }).isChecked(), true)
      const entropyPanel = page.getByRole("checkbox", { name: "Show Entropy panel" })
      assert.equal(await entropyPanel.isChecked(), false)

      await entropyPanel.focus()
      await page.keyboard.press("Space")
      await page.locator("#d3entropyParent").waitFor()
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "shows the panels of a narrative slide without a panel query",
    async run() {
      const { page, pageErrors } = await openViewer(undefined, {
        files: [
          { name: "story.md", text: PANEL_FREE_NARRATIVE },
          { name: "entropy.json", text: JSON.stringify(entropyDataset) },
        ],
      })
      await page.locator("#NarrativeBlock_0 .explanation").waitFor()
      await page.locator("#d3entropyParent").waitFor()
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "folds the sidebar with its pull tab and gives its space to the panels",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset)
      const tab = page.getByRole("button", { name: "Hide Auspice controls" })
      const sidebar = page.getByRole("complementary", { name: "Controls" })
      const panelArea = page.locator(".auspice-vscode-panel-area")
      await page.locator("#MainTree .tip").first().waitFor()
      assert.equal(await tab.getAttribute("aria-expanded"), "true")
      const openWidth = await treeSvgWidth(page)

      await tab.click()
      // The panels widen once the sidebar has slid away
      await page.locator('.auspice-vscode-panel-area[data-sidebar-space="free"]').waitFor()
      const showTab = page.getByRole("button", { name: "Show Auspice controls" })
      assert.equal(await showTab.getAttribute("aria-expanded"), "false")
      assert.equal(
        await sidebar.evaluate((element) => element instanceof HTMLElement && element.inert),
        true,
      )
      // The tab stays on the left edge of the panels, clear of the panel content
      const tabBox = await showTab.boundingBox()
      assert.ok(tabBox !== null && tabBox.x + tabBox.width > 10 && tabBox.x < 1)
      await page.waitForFunction((width) => {
        const svg = document.getElementById("MainTree")?.closest("svg")
        return Number(svg?.getAttribute("width")) > width + 200
      }, openWidth)
      assert.deepEqual(await tipsOutsideTreeSvg(page), [])

      await showTab.focus()
      await page.keyboard.press("Enter")
      await page.locator('.auspice-vscode-panel-area[data-sidebar-space="reserved"]').waitFor()
      assert.equal(
        await sidebar.evaluate((element) => element instanceof HTMLElement && element.inert),
        false,
      )
      assert.equal(
        await page.getByRole("button", { name: "Hide Auspice controls" }).isVisible(),
        true,
      )
      await page.waitForFunction(
        (width) =>
          Number(document.getElementById("MainTree")?.closest("svg")?.getAttribute("width")) ===
          width,
        openWidth,
      )
      const panelAreaBox = await panelArea.boundingBox()
      // Auspice's sidebar is 266 px wide: 220 px controls and 46 px padding
      assert.equal(panelAreaBox?.x, 266)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "lays the sidebar over the panels of a narrow viewer and docks it again in a wide one",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset, {
        viewport: { width: 700, height: 600 },
      })
      await page.locator("#MainTree .tip").first().waitFor()
      const rail = page.locator(".auspice-vscode-rail")
      const backdrop = page.locator(".auspice-vscode-backdrop")
      const panelArea = page.locator(".auspice-vscode-panel-area")
      // Oracle: Auspice starts the sidebar closed in a viewer of at most 780 px
      // (`controlsHiddenWidth`), and lays it over the panels
      assert.equal(await rail.getAttribute("data-state"), "closed")
      const closedBox = await panelArea.boundingBox()
      const showTab = page.getByRole("button", { name: "Show Auspice controls" })

      await showTab.click()
      await page.locator('.auspice-vscode-backdrop[data-state="open"]').waitFor()
      await backdrop.evaluate((element) =>
        Promise.all(element.getAnimations().map((animation) => animation.finished)),
      )
      const openBox = await panelArea.boundingBox()
      assert.equal(openBox?.width, closedBox?.width)
      assert.equal(await panelArea.getAttribute("data-sidebar-space"), "free")

      // Escape inside the sidebar closes it
      await page.getByRole("button", { name: "Hide Auspice controls" }).focus()
      await page.keyboard.press("Escape")
      await page.locator('.auspice-vscode-rail[data-state="closed"]').waitFor()

      // A click on the backdrop beside the sidebar closes it
      await showTab.click()
      await page.locator('.auspice-vscode-backdrop[data-state="open"]').waitFor()
      await page.mouse.click(690, 300)
      await page.locator('.auspice-vscode-rail[data-state="closed"]').waitFor()

      // In a wide viewer the sidebar docks with its state from the setting, here open
      await page.setViewportSize({ width: 1_400, height: 900 })
      await page.locator('.auspice-vscode-panel-area[data-sidebar-space="reserved"]').waitFor()
      assert.equal(await rail.getAttribute("data-state"), "open")
      assert.equal(await backdrop.count(), 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "starts with the sidebar folded when the setting asks for it",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset, { sidebar: "closed" })
      await page.locator("#MainTree .tip").first().waitFor()
      const tab = page.getByRole("button", { name: "Show Auspice controls" })
      assert.equal(await tab.getAttribute("aria-expanded"), "false")
      assert.equal(
        await page.locator(".auspice-vscode-panel-area").getAttribute("data-sidebar-space"),
        "free",
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  ...[
    { viewport: { width: 1_400, height: 900 }, secondDataset: undefined },
    { viewport: { width: 1_400, height: 900 }, secondDataset: shortNameDataset },
    { viewport: { width: 900, height: 520 }, secondDataset: undefined },
    { viewport: { width: 900, height: 520 }, secondDataset: shortNameDataset },
  ].map(({ viewport, secondDataset }) => ({
    name: `sizes ${secondDataset === undefined ? "one tree" : "two trees"} by Auspice's panel fractions in a ${viewport.width}x${viewport.height} viewer`,
    async run(): Promise<void> {
      const { page, pageErrors } = await openViewer(branchLabelDataset, { viewport, secondDataset })
      await page.locator("#MainTree .tip").first().waitFor()
      const { areaHeight, treeHeight, layout } = await page.evaluate(() => ({
        areaHeight: document.querySelector(".auspice-vscode-panels-scroll")?.clientHeight ?? 0,
        treeHeight: Number(
          document.getElementById("MainTree")?.closest("svg")?.getAttribute("height"),
        ),
        layout: document.querySelector<HTMLElement>(".auspice-vscode-tree-header")?.dataset[
          "layout"
        ],
      }))
      // Oracle: Auspice's `calcPanelDims()` gives a full panel 0.88 of the panel area height minus
      // 52 px; the tree drawing leaves out the title row of the card (26 px, 46 px with two trees)
      // and the header row when it takes its own row (26 px)
      const titleRow = secondDataset === undefined ? 26 : 46
      const headerRow = layout === "stacked" ? 26 : 0
      assert.equal(treeHeight, 0.88 * areaHeight - 52 - titleRow - headerRow)
      assert.deepEqual(pageErrors, [])
    },
  })),
  {
    name: "shows the narrative title above the slides and keeps the narrative toggle in the panel area",
    async run() {
      const { page, pageErrors } = await openViewer(undefined, {
        files: [
          { name: "story.md", text: NARRATIVE },
          { name: "flu.json", text: JSON.stringify(tipLabelDataset) },
        ],
      })
      // The title row above the progress dots, ahead of the title slide
      await page.getByRole("heading", { level: 2, name: "Local narrative" }).first().waitFor()
      await page.locator("#NarrativeBlock_0 .explanation").waitFor()
      // Auspice fades the slides out below its progress dots, at a fixed offset that assumes a
      // title row above the dots. Without the row, the fade covered the first lines of the slide.
      const { progressBottom, fadeTop } = await page.evaluate(() => {
        const progress = document.querySelector('#NarrativeContainer > [role="navigation"]')
        const fade = progress?.nextElementSibling
        return {
          progressBottom: progress?.getBoundingClientRect().bottom ?? Number.NaN,
          fadeTop: fade?.getBoundingClientRect().top ?? Number.NaN,
        }
      })
      assert.ok(
        Math.abs(fadeTop - progressBottom) < 1,
        `the fade starts at ${fadeTop}, the progress dots end at ${progressBottom}`,
      )
      const toggle = page.getByRole("button", { name: "explore the data yourself" })
      const toggleBox = await toggle.boundingBox()
      const areaBox = await page.locator(".auspice-vscode-panel-area").boundingBox()
      assert.ok(
        toggleBox !== null && areaBox !== null && toggleBox.y >= areaBox.y - 1,
        "the narrative toggle covers the toolbar",
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "shows the summary, a filter, the downloads and the zoom buttons in one title row",
    async run() {
      const { page, pageErrors } = await openViewer(contractDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      const filter = page.getByRole("combobox", { name: "Filter Data" })
      await filter.fill("Switzerland")
      await page
        .getByRole("option", { name: /Switzerland/u })
        .first()
        .click()
      await page.getByRole("button", { name: "Remove filter Switzerland" }).waitFor()
      assert.equal(await headerLayout(page), "overlay")
      const row = await titleRowBoxes(page)
      // Oracle: the parts sit in the 26 px title row of the tree card, from left to right
      const parts = [row.summary, row.badge, ...row.downloads, ...row.zoomButtons]
      for (const part of parts) {
        assert.ok(
          part !== undefined && part.top >= row.card.top && part.bottom <= row.card.top + 26,
          `a part of the title row lies at ${JSON.stringify(part)}, the card at ${JSON.stringify(row.card)}`,
        )
      }
      assert.ok(row.badge !== undefined && row.summary !== undefined)
      assert.ok(row.badge.right <= row.summary.right, "the filter badge is cut off")
      assert.deepEqual(
        overlappingNeighbors([row.summary, ...row.downloads, ...row.zoomButtons]),
        [],
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "puts the title row above the tree card where the card is narrow",
    async run() {
      // A 600 px viewer leaves the tree card too narrow for the downloads and the summary beside
      // the zoom buttons
      const { page, pageErrors } = await openViewer(tipLabelDataset, {
        viewport: { width: 600, height: 520 },
      })
      await page.locator("#MainTree .tip").first().waitFor()
      assert.equal(await headerLayout(page), "stacked")
      const row = await titleRowBoxes(page)
      assert.ok(row.header !== undefined && row.header.bottom <= row.card.top)
      // Oracle: the downloads end where the zoom buttons below them end
      const lastDownload = row.downloads.at(-1)
      const lastZoomButton = row.zoomButtons.at(-1)
      assert.ok(lastDownload !== undefined && lastZoomButton !== undefined)
      assert.ok(Math.abs(lastDownload.right - lastZoomButton.right) < 1)
      assert.deepEqual(overlappingNeighbors([row.summary, ...row.downloads]), [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "keeps the names of two trees clear of the title row and of the topmost tips",
    async run() {
      const { page, pageErrors } = await openViewer(tipLabelDataset, {
        secondDataset: shortNameDataset,
      })
      await page.locator("#SecondTree .tip").first().waitFor()
      await page.locator("#SecondTreeTitle").waitFor()
      assert.equal(await headerLayout(page), "stacked")
      const boxes = await page.evaluate(() => {
        const box = (element: Element | null | undefined): Box | undefined => {
          const rect = element?.getBoundingClientRect()
          return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        }
        const topmostTip = (treeId: string): number =>
          Math.min(
            ...[...document.querySelectorAll(`#${treeId} .tip`)].map(
              (tip) => tip.getBoundingClientRect().top,
            ),
          )
        return {
          header: box(document.querySelector(".auspice-vscode-tree-header")),
          names: [
            box(document.getElementById("MainTreeTitle")),
            box(document.getElementById("SecondTreeTitle")),
          ],
          topmostTip: Math.min(topmostTip("MainTree"), topmostTip("SecondTree")),
        }
      })
      for (const name of boxes.names) {
        assert.ok(
          name !== undefined &&
            boxes.header !== undefined &&
            name.top >= boxes.header.bottom &&
            name.bottom <= boxes.topmostTip,
          `a tree name lies at ${JSON.stringify(name)}, the row ends at ${boxes.header?.bottom}, the tips start at ${boxes.topmostTip}`,
        )
      }
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "shows the tree and the map side by side in a wide viewer",
    async run() {
      // Auspice starts with the grid layout in a window wider than 1600 px
      const { page, pageErrors } = await openViewer(contractDataset, {
        viewport: { width: 1_700, height: 900 },
        panels: "dataset",
      })
      await page.locator(".leaflet-container canvas").first().waitFor()
      await page.getByRole("button", { name: "grid" }).waitFor()
      const { tree, map } = await page.evaluate(() => {
        const box = (element: Element | null | undefined): Box | undefined => {
          const rect = element?.getBoundingClientRect()
          return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        }
        return {
          tree: box(document.getElementById("MainTree")?.closest("svg")),
          map: box(document.querySelector(".leaflet-container")),
        }
      })
      assert.ok(
        tree !== undefined && map !== undefined && map.left >= tree.right && map.top < tree.bottom,
        `the tree lies at ${JSON.stringify(tree)}, the map at ${JSON.stringify(map)}`,
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  ...["clock", "scatter", "radial", "unrooted"].map((layout) => ({
    name: `keeps branch and axis labels inside the tree panel in the ${layout} layout`,
    async run(): Promise<void> {
      const { page, pageErrors } = await openViewer(datedBranchLabelDataset)
      await page.locator("#MainTree .branchLabel").getByText(ROOT_BRANCH_LABEL).waitFor()
      await page.getByRole("button", { name: layout, exact: true }).click()
      // Auspice moves the tree to the new layout in stages, which take up to 2 s
      await page.waitForFunction(
        (expected) => new URLSearchParams(window.location.search).get("l") === expected,
        layout,
      )
      await page.waitForTimeout(2_500)
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page), [])
      assert.deepEqual(pageErrors, [])
    },
  })),
  {
    name: "hides the branch labels of a narrow tanglegram tree that do not fit beside the root",
    async run() {
      // Long tip names take most of each half of a 900 px viewer, so the margin on the root side
      // reaches its limit of a quarter of the tree before the longest labels fit
      const { page, pageErrors } = await openViewer(datedBranchLabelDataset, {
        viewport: { width: 900, height: 700 },
        secondDataset: datedBranchLabelDataset,
      })
      await page.locator("#SecondTree .tip").first().waitFor()
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page, "MainTree"), [])
      assert.deepEqual(await treeLabelsOutsideTreeSvg(page, "SecondTree"), [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "draws the Natural Earth basemap from the files of the extension",
    async run() {
      const { page, pageErrors, foreignRequests } = await openViewer(contractDataset, {
        panels: "dataset",
      })
      await page.locator(".leaflet-container canvas").first().waitFor()
      // Oracle: the map style names the outlines, borders and labels, and the glyphs of the label
      // font for the characters of the country names (`basemap.ts`)
      await page.waitForFunction((files) => {
        const requested = performance.getEntriesByType("resource").map(({ name }) => name)
        return files.every((file) => requested.some((url) => url.endsWith(file)))
      }, BASEMAP_FILES)
      const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
      assert.ok(svgExport?.content.includes('<svg id="map"') === true, "the SVG export has no map")
      assert.ok(
        /Map: .*Natural Earth.*5\.1\.2/su.test(svgExport?.content ?? ""),
        "the caption does not name the map data",
      )
      // Oracle: the caption HTML has a space between the link and the version, which is about
      // 3.5 px wide in its 14 px font; without it, the two texts touch
      const gap = await textGapInSvgExport(page, svgExport?.content ?? "", "Natural Earth", "5.1.2")
      assert.ok(gap > 2, `the gap between "Natural Earth" and "5.1.2" is ${gap} px`)
      assert.deepEqual(foreignRequests, [])
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "turns on the map of added coordinates and keeps a panel that the user turned off",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset, {
        panels: "dataset",
      })
      await page.locator("#d3entropyParent").waitFor()
      const entropyPanel = page.getByRole("checkbox", { name: "Show Entropy panel" })
      await entropyPanel.focus()
      await page.keyboard.press("Space")
      await page.locator("#d3entropyParent").waitFor({ state: "detached" })

      await addMetadata(page, [{ name: "places.csv", text: COORDINATES_CSV }])
      await page.locator(".leaflet-container canvas").first().waitFor()
      assert.equal(await entropyPanel.isChecked(), false)
      assert.equal(await page.locator("#d3entropyParent").count(), 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "says why added coordinates show no map when the window has no WebGL",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset, {
        webgl: false,
      })
      await page.locator("#MainTree .tip").first().waitFor()
      await addMetadata(page, [{ name: "places.csv", text: COORDINATES_CSV }])
      await page.locator(".auspice-vscode-status").getByText(/WebGL/u).waitFor()
      assert.equal(await page.locator(".leaflet-container").count(), 0)
      assert.equal(await page.getByRole("checkbox", { name: "Show Map panel" }).count(), 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "keeps the load errors on screen when the host clears the stale mark",
    async run() {
      const { page } = await openViewer(undefined, {
        files: [{ name: "broken.auspice.json", text: "{ not json" }],
      })
      const heading = page.getByRole("heading", { name: "The dataset could not be loaded" })
      await heading.waitFor()
      // Oracle: the host clears the stale mark after each load (`loadComplete` in
      // `src/viewerManager.ts`), and the dataset still failed to load
      await page.evaluate(async () => {
        const { promise, resolve: handled } = Promise.withResolvers<void>()
        window.addEventListener(
          "message",
          () => {
            setTimeout(handled)
          },
          { once: true },
        )
        window.postMessage({ type: "stale", stale: false }, "*")
        await promise
      })
      assert.equal(await heading.count(), 1)
    },
  },
  {
    name: "draws every tip of a partly dated tree by divergence",
    async run() {
      // Oracle: the placed sequence has no date, so it has no position on a time axis
      const { page, pageErrors } = await openViewer(partlyDatedDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      assert.equal(await page.locator("#MainTree .tip").count(), 3)
      assert.deepEqual(await tipsOutsideTreeSvg(page), [])
      assert.equal(await page.getByRole("button", { name: "time", exact: true }).count(), 0)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "maps added coordinates that share their digits to separate places",
    async run() {
      const { page, pageErrors } = await openViewer(shortNameDataset)
      await page.locator("#MainTree .tip").first().waitFor()
      await addMetadata(page, [{ name: "places.csv", text: SPLIT_COORDINATES_CSV }])
      await page.locator(".leaflet-container canvas").first().waitFor()
      await mapLegend(page)
      // Oracle: A and B are at (1, 23) and (12, 3); C has no coordinates and is left out
      const places = await page.evaluate(
        () =>
          new Set(
            [...document.querySelectorAll("#d3DemesTransmissions [transform^='translate']")].map(
              (deme) => deme.getAttribute("transform"),
            ),
          ).size,
      )
      assert.equal(places, 2)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "exports the map after its panel is turned off and on",
    async run() {
      const { page, pageErrors } = await openViewer(contractDataset, { panels: "dataset" })
      await page.locator(".leaflet-container canvas").first().waitFor()
      const mapPanel = page.getByRole("checkbox", { name: "Show Map panel" })
      await mapPanel.focus()
      await page.keyboard.press("Space")
      await page.locator(".leaflet-container").waitFor({ state: "detached" })
      await page.keyboard.press("Space")
      await page.locator(".leaflet-container canvas").first().waitFor()
      const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
      const mapContent = /<svg id="map"[^>]*>(?<inner>[\s\S]*?)<\/svg>/u.exec(
        svgExport?.content ?? "",
      )?.groups?.["inner"]
      assert.ok(mapContent !== undefined && mapContent.length > 0, "the exported map is empty")
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "colors the second tree by genotype",
    async run() {
      const { page, pageErrors } = await openViewer(genotypeDataset, {
        secondDataset: genotypeDataset,
      })
      await page.locator("#SecondTree .tip").first().waitFor()
      // Oracle: Auspice draws a tip without a color in the color of missing values, #ADB1B3
      const missingColor = "rgb(173, 177, 179)"
      const strokes = await page.evaluate(() =>
        [...document.querySelectorAll("#SecondTree .tip")].map(
          (tip) => getComputedStyle(tip).stroke,
        ),
      )
      assert.equal(strokes.length, 3)
      assert.deepEqual(
        strokes.filter((stroke) => stroke === missingColor),
        [],
      )
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "gives the tree legend and the map legend their own clip paths",
    async run() {
      const { page, pageErrors } = await openViewer(contractDataset, { panels: "dataset" })
      await mapLegend(page)
      const clipIds = await page.evaluate(() =>
        [...document.querySelectorAll('[id="LegendContainer"] clipPath')].map((clip) => clip.id),
      )
      // Oracle: an ID refers to the first element with it, so each clip path needs its own
      assert.ok(clipIds.length >= 2, `clip path IDs: ${clipIds.join(", ")}`)
      assert.equal(new Set(clipIds).size, clipIds.length, `clip path IDs: ${clipIds.join(", ")}`)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "keeps the zoomed clade when the tree panel is turned off and on",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset, { panels: "dataset" })
      await page.locator("#MainTree .tip").first().waitFor()
      const unzoomed = await stableTipPositions(page)
      await zoomIntoClade(page, "AB")
      const zoomed = await stableTipPositions(page)
      assert.notDeepEqual(zoomed, unzoomed)
      const treePanel = page.getByRole("checkbox", { name: "Show Tree panel" })
      await treePanel.focus()
      await page.keyboard.press("Space")
      await page.locator("#MainTree").waitFor({ state: "detached" })
      await page.keyboard.press("Space")
      await page.locator("#MainTree .tip").first().waitFor()
      assert.deepEqual(await stableTipPositions(page), zoomed)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "draws one entropy chart after its panel is turned off and on",
    async run() {
      const { page, pageErrors } = await openViewer(entropyDataset, { panels: "dataset" })
      await page.locator("#d3entropy #mainBars").waitFor({ state: "attached" })
      const entropyPanel = page.getByRole("checkbox", { name: "Show Entropy panel" })
      await entropyPanel.focus()
      for (const _round of [1, 2]) {
        await page.keyboard.press("Space")
        await page.locator("#d3entropyParent").waitFor({ state: "detached" })
        await page.keyboard.press("Space")
        await page.locator("#d3entropy #mainBars").waitFor({ state: "attached" })
      }
      assert.equal(await page.locator("#d3entropy #mainBars").count(), 1)
      assert.equal(await page.locator("#d3entropy #entropyYAxis").count(), 1)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "keeps the labels and the legend of the SVG export inside the figure at a viewer scale of 0.8",
    async run() {
      const { page, pageErrors } = await openViewer({
        ...contractDataset,
        meta: { ...contractDataset.meta, panels: ["tree"] },
        tree: tipLabelDataset.tree,
      })
      await page.locator("#MainTree .tip").first().waitFor()
      await page.evaluate(() => {
        window.postMessage({ type: "setScale", scale: 0.8 }, "*")
      })
      await page.waitForFunction(
        () =>
          document.getElementById("root")?.style.getPropertyValue("--auspice-viewer-scale") ===
          "0.8",
      )
      const legend = page.locator('[id="LegendContainer"]').first()
      await legend.waitFor()
      assert.deepEqual(await treeLabelsOutsideSvgExport(page), [])
      assert.deepEqual(await legendTextsOutsideSvgExport(page), [])
      // Oracle: the export draws the panels at their layout size, which the CSS scale of the
      // viewer does not change, so the legend keeps its layout size too. The export writes
      // positions to 0.01 px.
      const layoutSize = await legend.evaluate((element) => {
        const style = getComputedStyle(element)
        return [style.width, style.height].map((size) => Number(parseFloat(size).toFixed(2)))
      })
      const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
      const legendTag =
        /<svg id="treeLegend" width="(?<width>[^"]+)" height="(?<height>[^"]+)"/u.exec(
          svgExport?.content ?? "",
        )
      const exportedSize = [legendTag?.groups?.["width"], legendTag?.groups?.["height"]].map(
        (size) => Number(Number(size).toFixed(2)),
      )
      assert.deepEqual(exportedSize, layoutSize)
      assert.deepEqual(pageErrors, [])
    },
  },
  {
    name: "hides the map and reports why when the window has no WebGL",
    async run() {
      const { page, pageErrors } = await openViewer(contractDataset, {
        webgl: false,
        panels: "dataset",
      })
      await page.locator("#MainTree .tip").first().waitFor()
      assert.equal(await page.locator(".leaflet-container").count(), 0)
      assert.equal(await page.getByText("Something's gone wrong within the map panel").count(), 0)
      const warnings = await page.evaluate(() =>
        (window.viewerMessages ?? []).flatMap((message) =>
          typeof message === "object" &&
          message !== null &&
          "type" in message &&
          message.type === "diagnostics" &&
          "diagnostics" in message &&
          Array.isArray(message.diagnostics)
            ? message.diagnostics.map(
                (diagnostic: { readonly message?: string }) => diagnostic.message,
              )
            : [],
        ),
      )
      assert.ok(
        warnings.some((warning) => warning?.includes("the map needs WebGL") === true),
        `diagnostics: ${JSON.stringify(warnings)}`,
      )
      assert.deepEqual(pageErrors, [])
    },
  },
]
// An argument runs only the scenarios whose name contains it
const nameFilter = process.argv[2] ?? ""
try {
  for (const scenario of scenarios.filter(({ name }) => name.includes(nameFilter))) {
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

/**
 * Return the test page of the client: the webview shell with the production Content Security
 * Policy, and a stub of the VS Code API that records the messages that the client posts
 */
function browserPage(): Response {
  const nonce = crypto.randomUUID().replaceAll("-", "")
  const csp = webviewCsp({ cspSource: server.url.origin, nonce })
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <style>html,body,#root{width:100%;height:100%;margin:0}</style>
  </head>
  <body>
    <div id="root" data-basemap-base="${server.url.origin}/${CLIENT_BASEMAP_DIRECTORY}"></div>
    <script nonce="${nonce}">
      window.viewerMessages = [];
      window.acquireVsCodeApi = () => ({ postMessage: (message) => window.viewerMessages.push(message) });
    </script>
    <script type="module" nonce="${nonce}" src="/${CLIENT_BUNDLE_FILE}"></script>
  </body>
</html>`
  return new Response(html, { headers: { "Content-Type": "text/html" } })
}

/** Serve a basemap file of the client, as the webview serves the extension's resources */
function basemapFile(url: URL): Response {
  const path = resolve(
    basemapRoot,
    decodeURIComponent(url.pathname.slice(`/${CLIENT_BASEMAP_DIRECTORY}/`.length)),
  )
  if (!path.startsWith(`${basemapRoot}/`)) return new Response(null, { status: 404 })
  return new Response(Bun.file(path))
}

async function openViewer(
  dataset: unknown,
  {
    viewport = { width: 1_400, height: 900 },
    secondDataset,
    files = [],
    sidebar = "open",
    webgl = true,
    panels = "tree",
  }: ViewerOptions = {},
): Promise<OpenViewer> {
  const page = await browser.newPage({ viewport })
  if (!webgl) {
    // A VS Code window without hardware acceleration may have no WebGL context at all
    await page.addInitScript({
      content: `{
        const getContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          return type === "webgl" || type === "webgl2" ? null : getContext.call(this, type, ...rest)
        }
      }`,
    })
  }
  const pageErrors: string[] = []
  const consoleTimers: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.text().startsWith("Timer ")) consoleTimers.push(message.text())
    // A request or script that the webview CSP blocks fails without a page error
    if (message.type() === "error" && message.text().includes("Content Security Policy")) {
      pageErrors.push(message.text())
    }
  })
  // The viewer may request nothing from another origin; such requests are recorded and aborted
  const foreignRequests: string[] = []
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url())
    if (requestUrl.origin === server.url.origin || requestUrl.protocol === "data:") {
      await route.continue()
      return
    }
    foreignRequests.push(requestUrl.toString())
    await route.abort()
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
    ...(dataset === undefined
      ? []
      : [{ name: "browser.auspice.json", text: JSON.stringify(dataset) }]),
    ...(secondDataset === undefined
      ? []
      : [{ name: "second.auspice.json", text: JSON.stringify(secondDataset) }]),
    ...files,
  ]
  await loadFiles(page, resources, { sidebar, panels })
  return { page, pageErrors, consoleTimers, foreignRequests }
}

interface Scenario {
  readonly name: string
  run(): Promise<void>
}

interface ViewerOptions {
  readonly viewport?: { readonly width: number; readonly height: number }
  /** Dataset shown as the second tree of a tanglegram */
  readonly secondDataset?: unknown
  /** Further input files, e.g. a narrative and its datasets */
  readonly files?: readonly ViewerFile[]
  readonly sidebar?: "open" | "closed"
  /** Whether the browser provides WebGL */
  readonly webgl?: boolean
  /** The `initialPanels` setting */
  readonly panels?: "tree" | "dataset"
}

/** A box on the page, as `DOMRect.toJSON()` gives it */
interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

interface TitleRowBoxes {
  readonly card: Box
  readonly header: Box | undefined
  readonly summary: Box | undefined
  readonly badge: Box | undefined
  readonly downloads: readonly Box[]
  readonly zoomButtons: readonly Box[]
}

interface ViewerFile {
  readonly name: string
  readonly text: string
}

interface OpenViewer {
  readonly page: Page
  readonly pageErrors: string[]
  readonly consoleTimers: string[]
  /** Requests to other origins than the test server, which the page may not make */
  readonly foreignRequests: string[]
}

/** Return the width of the main tree SVG */
function treeSvgWidth(page: Page): Promise<number> {
  return page.evaluate(() =>
    Number(document.getElementById("MainTree")?.closest("svg")?.getAttribute("width")),
  )
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
 * Return the visible labels of a tree that are not completely shown on screen: labels that extend
 * past the tree SVG, or past the clip path of their group
 */
function treeLabelsOutsideTreeSvg(page: Page, treeId = "MainTree"): Promise<string[]> {
  return page.evaluate((id) => {
    const tree = document.getElementById(id)
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
  }, treeId)
}

/**
 * Export the SVG screenshot and return the tree labels that are not fully visible in it: labels
 * outside the image, or outside the tree panel when the panel clips its content
 */
async function treeLabelsOutsideSvgExport(page: Page): Promise<string[]> {
  const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
  return page.evaluate((content) => {
    const exported = new DOMParser().parseFromString(content, "image/svg+xml")
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
  }, svgExport?.content ?? "")
}

/**
 * Export the SVG screenshot and return the legend texts that lie outside their legend in it, e.g.
 * where the legend was measured at another scale than the panels
 */
async function legendTextsOutsideSvgExport(page: Page): Promise<string[]> {
  const [svgExport] = await downloadsFromTreeButtons(page, ["SVG"])
  return page.evaluate((content) => {
    const exported = new DOMParser().parseFromString(content, "image/svg+xml")
    const image = document.importNode(exported.documentElement, true)
    document.body.append(image)
    const outside = [...image.querySelectorAll('svg[id$="Legend"]')].flatMap((legend) => {
      const bounds = legend.getBoundingClientRect()
      return [...legend.querySelectorAll("text")]
        .filter((text) => {
          const rect = text.getBoundingClientRect()
          return (
            rect.width > 0 &&
            (rect.left < bounds.left - 0.5 ||
              rect.right > bounds.right + 0.5 ||
              rect.top < bounds.top - 0.5 ||
              rect.bottom > bounds.bottom + 0.5)
          )
        })
        .map((text) => text.textContent ?? "")
    })
    image.remove()
    return outside
  }, svgExport?.content ?? "")
}

/** Wait for the legend of the map, which Auspice draws in the map card next to the map */
async function mapLegend(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const card = document.querySelector(".leaflet-container")?.closest('[id$="Card"]')
    return (card?.querySelector('[id="LegendContainer"]') ?? null) !== null
  })
}

/** Return the horizontal space between two texts of an exported SVG, as a browser draws it */
function textGapInSvgExport(
  page: Page,
  content: string,
  left: string,
  right: string,
): Promise<number> {
  return page.evaluate(
    ({ svg, leftText, rightText }) => {
      const exported = new DOMParser().parseFromString(svg, "image/svg+xml")
      const image = document.importNode(exported.documentElement, true)
      document.body.append(image)
      const box = (text: string): DOMRect | undefined =>
        [...image.querySelectorAll("text")]
          .find((element) => element.textContent?.trim() === text)
          ?.getBoundingClientRect()
      const gap = (box(rightText)?.left ?? Number.NaN) - (box(leftText)?.right ?? Number.NaN)
      image.remove()
      return gap
    },
    { svg: content, leftText: left, rightText: right },
  )
}

/** Return the positions of the tips of the main tree, once they stay in place for half a second */
async function stableTipPositions(page: Page): Promise<number[][]> {
  await page.evaluate(() => {
    window.tipPositions = { last: "", stableFrames: 0 }
  })
  // Auspice moves the tips in staged transitions; they stop for good once the tree is drawn
  await page.waitForFunction(
    () => {
      const now = JSON.stringify(
        [...document.querySelectorAll("#MainTree .tip")].map((tip) => {
          const rect = tip.getBoundingClientRect()
          return [Math.round(rect.x), Math.round(rect.y)]
        }),
      )
      const positions = window.tipPositions ?? { last: "", stableFrames: 0 }
      window.tipPositions =
        positions.last === now
          ? { last: now, stableFrames: positions.stableFrames + 1 }
          : { last: now, stableFrames: 0 }
      return window.tipPositions.stableFrames >= 30
    },
    undefined,
    { polling: "raf" },
  )
  const positions = await page.evaluate(() => window.tipPositions?.last ?? "[]")
  return z.array(z.array(z.number())).parse(JSON.parse(positions))
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

/** Return the layout of the header row of the tree card: "overlay" or "stacked" */
function headerLayout(page: Page): Promise<string | undefined> {
  return page.evaluate(
    () => document.querySelector<HTMLElement>(".auspice-vscode-tree-header")?.dataset["layout"],
  )
}

/** Return the boxes of the tree card, its header row, and the parts of the row and the title row */
function titleRowBoxes(page: Page): Promise<TitleRowBoxes> {
  return page.evaluate(() => {
    const box = (rect: DOMRect | undefined): Box | undefined =>
      rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    const boxes = (elements: Iterable<Element>): Box[] =>
      [...elements].flatMap((element) => box(element.getBoundingClientRect()) ?? [])
    const card = document.getElementById("MainTree")?.closest("[id$=Card]")
    const summary = document.querySelector(".auspice-vscode-tree-summary")
    // The text of the summary, which ends before the free space of its box. The badge tooltips
    // wait off screen.
    const range = document.createRange()
    if (summary !== null) range.selectNodeContents(summary)
    const summaryBox = summary?.getBoundingClientRect()
    const textBoxes = [...range.getClientRects()].filter(
      (rect) =>
        summaryBox !== undefined &&
        rect.width > 0 &&
        rect.left >= summaryBox.left - 1 &&
        rect.top >= summaryBox.top - 1 &&
        rect.bottom <= summaryBox.bottom + 1,
    )
    const textBox =
      textBoxes.length === 0
        ? undefined
        : {
            left: Math.min(...textBoxes.map((rect) => rect.left)),
            right: Math.max(...textBoxes.map((rect) => rect.right)),
            top: Math.min(...textBoxes.map((rect) => rect.top)),
            bottom: Math.max(...textBoxes.map((rect) => rect.bottom)),
          }
    const badge = document.querySelector(
      '.auspice-vscode-tree-summary [aria-label^="Remove filter"]',
    )?.parentElement
    return {
      card: box(card?.getBoundingClientRect()) ?? { left: 0, right: 0, top: 0, bottom: 0 },
      header: box(document.querySelector(".auspice-vscode-tree-header")?.getBoundingClientRect()),
      summary: textBox,
      badge: box(badge?.getBoundingClientRect()),
      downloads: boxes(document.querySelectorAll(".auspice-vscode-tree-download")),
      zoomButtons: boxes(
        card?.querySelectorAll("#CardContentContainer > div:last-child > button") ?? [],
      ),
    }
  })
}

/** Return the pairs of neighbors, from left to right, that overlap */
function overlappingNeighbors(boxes: readonly (Box | undefined)[]): string[] {
  return boxes.slice(1).flatMap((next, index) => {
    const previous = boxes[index]
    return previous === undefined || next === undefined || previous.right <= next.left
      ? []
      : [`${JSON.stringify(previous)} overlaps ${JSON.stringify(next)}`]
  })
}

/** Add metadata files to the view, as the "Add Metadata to Current View" command does */
async function addMetadata(page: Page, files: readonly ViewerFile[]): Promise<void> {
  await page.evaluate((inputFiles) => {
    const resources = inputFiles.map(({ name, text }) => ({
      uri: `file:///${name}`,
      name,
      bytes: new TextEncoder().encode(text).buffer,
    }))
    window.postMessage({ type: "addMetadata", resources }, "*")
  }, files)
}

/** Wait until the page has rendered two more frames, so that the updates of an input show */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(() => {
    const frames = Promise.withResolvers<void>()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        frames.resolve()
      })
    })
    return frames.promise
  })
}

/** Press download buttons of the tree panel and return the downloaded files */
async function downloadsFromTreeButtons(
  page: Page,
  buttons: readonly string[],
): Promise<{ filename: string; content: string }[]> {
  await page.evaluate(() => {
    const listening = window.treeButtonDownloads !== undefined
    window.treeButtonDownloads = []
    if (listening) return
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

async function loadFiles(
  page: Page,
  files: readonly ViewerFile[],
  {
    sidebar,
    panels,
  }: {
    readonly sidebar: "open" | "closed"
    readonly panels: "tree" | "dataset"
  },
): Promise<void> {
  await page.evaluate(
    ({ inputFiles, sidebarInitialState, initialPanels }) => {
      const resources = inputFiles.map(({ name, text }) => ({
        uri: `file:///${name}`,
        name,
        bytes: new TextEncoder().encode(text).buffer,
      }))
      window.postMessage(
        {
          type: "load",
          generation: 1,
          resources,
          resourceLimitBytes: 1_000_000,
          largeTreeTipAdvisory: 0,
          sidebarInitialState,
          initialPanels,
          locale: "en",
        },
        "*",
      )
    },
    { inputFiles: files, sidebarInitialState: sidebar, initialPanels: panels },
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
    treeButtonDownloads?: { filename: string; content: string }[]
    tipPositions?: { last: string; stableFrames: number }
  }
}
