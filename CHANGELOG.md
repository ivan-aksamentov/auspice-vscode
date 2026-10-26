# Changelog

## 0.5.0

### Commands

- **Reload button in the editor title**: the refresh icon in the editor title bar of a viewer reloads the view. It starts the page again and reads the input files from disk. It replaces the gray toolbar at the top of the viewer, so the tree has more height
- **Status in the status bar**: the VS Code status bar shows when the viewer loads, when its input files changed on disk, and how many errors the inputs have. A click reloads the view or shows the errors in the Problems panel. A window without WebGL tells in a notification why added coordinates show no map. Before, the toolbar of the viewer showed this text
- **No Taxonium command**: the command Open Current Tree in Taxonium and its button are removed. They only opened `https://taxonium.org/` in the browser or copied the path of the dataset, and you selected the file in Taxonium yourself

### Tip panel

- **Links of a tip open in the browser**: the links in the panel of a clicked tip (Accession, Genbank accession, GISAID EPI ISL, Strain URL) open the linked page, as the links above the tree do. Before, a click on them did nothing

### Errors

- **Load errors stay on screen**: when a dataset cannot be loaded, the viewer keeps showing the list of errors. Before, the list showed for a moment, and then the loading logo replaced it

## 0.4.0

### Auspice 3.1.0

- **Auspice 3.1.0**: the viewer embeds Auspice 3.1.0 (2026-10-15), up from 3.0.0 (2026-09-02). The map legend shows how many tips each circle size stands for, and a hover over a circle or an arc of the map shows its tip count. Long legends use one column where it fits and scroll when they overflow. See the [Auspice changelog](https://github.com/nextstrain/auspice/blob/c3122c404328a89888a332d12f638a6ac28e2364/CHANGELOG.md#version-310---20261015)
- **SVG figures**: the SVG download of Auspice 3.1.0 is new, and vector editors such as Inkscape and Illustrator read its figures better. The figure embeds the Lato font, so that it looks the same on every computer

### Map

- **Map without network access**: the map draws the country outlines, borders and names of [Natural Earth](https://www.naturalearthdata.com/) 5.1.2 (2022-05-13) from files that ship with the extension, and loads them only when a map is shown. The viewer loads only the files of the extension and sends no request to another server
- **Map available by default**: the `auspiceVscode.mapsEnabled` setting is removed. The map is a panel like the others: the Map toggle in the sidebar turns it on and off, and `auspiceVscode.initialPanels` decides whether it shows at the start. Before, maps were off unless the setting turned them on, because the map loaded its tiles from OpenFreeMap
- **Map of added coordinates**: metadata with `latitude` and `longitude` columns shows a map of the samples, also for a dataset without a map. Samples at different places stay apart, for example at `(1, 23)` and `(12, 3)`. Rows with an empty coordinate are skipped instead of placed at `(0, 0)`, and a file with only names and coordinates is accepted. In a window without WebGL, the toolbar says why the coordinates show no map
- **Map in SVG figures**: the figure contains the map also after you turn the map panel off and on. Before, the map was empty

### Panels and sidebar

- **Panel sizes as on nextstrain.org**: the panels have the sizes that Auspice gives them, so the tree and the map share a row in the grid layout, and the panel area scrolls. Before, the tree, the map and the measurements filled the height of the editor
- **Title row of the tree**: the summary of the shown tips, the filter badges and the download buttons are next to the zoom buttons in the title row of the tree, as in Nextclade. Where the tree card is narrow or shows two trees, they get a row above the card
- **Sidebar in narrow viewers**: in a viewer of 780 pixels or narrower, the sidebar opens over the panels and is closed at the start, as on nextstrain.org. Escape or a click beside the sidebar closes it. Before, the sidebar left a split editor of 600 pixels about 330 pixels for the tree. `auspiceVscode.sidebarInitialState` applies when the viewer becomes wider
- **Pull tab**: the tab that folds the sidebar has the size, place and slide timing of Auspice's tab, and its name tells screen readers whether it shows or hides the sidebar
- **Panels that you turned off stay off**: Auspice turned every available panel on after you added metadata or removed the second tree, which undid your choices and the `auspiceVscode.initialPanels` setting. Now only a panel that becomes available turns on, such as the map of added coordinates
- **Kept zoom**: the tree keeps its zoomed clade when you turn its panel off and on

### Downloads

- **More downloads**: TSV downloads of the metadata, the authors and the GISAID acknowledgments of the shown tips, and of the genetic diversity data of the entropy chart. GISAID asks users to cite the acknowledgments table. Each download shows only where the sharing settings of the dataset allow it, as in Auspice
- **No download dialog**: Auspice's download dialog described the data of nextstrain.org (page address, data use, license) and wrote "Last updated undefined" for Newick trees. The buttons in the title row of the tree replace it and offer each of its downloads except the Nexus tree. The footer no longer links to the dialog
- **Caption of SVG figures**: the caption names the dataset, its update date, the shown tips, the source of the map data and the Auspice version, and cites the Auspice publication. Before, the caption of Auspice gave the address, the data use terms and the license of a nextstrain.org page

### Tree

- **Partly dated trees**: trees in which only some nodes have dates, such as the `nextclade.auspice.json` output of Nextclade, show by divergence only, without the time view, the clock layout and the date controls. Before, the time view left out the nodes without a date
- **Second tree colored by genotype**: after "Compare with Another Tree", a coloring by genotype colors both trees when they have the same genome annotation. Before, the second tree stayed gray
- **Entropy chart axes**: in narrow panels, the genome axes of the entropy chart show fewer numbers, so that the numbers do not run into each other

### Documentation

- **Changelog**: the extension page in VS Code and on the Visual Studio Marketplace has a Changelog tab with the changes of each version, and each GitHub release lists the changes of its version

## 0.3.0

### Auspice 3.0.0

- **Auspice 3.0.0**: the viewer embeds Auspice 3.0.0 (2026-09-02), up from 2.73.0 (2026-07-07). Auspice 3 draws the map with MapLibre from the vector tiles of [OpenFreeMap](https://openfreemap.org/), so `auspiceVscode.mapsEnabled` loads the map tiles from `tiles.openfreemap.org` instead of Mapbox and OpenStreetMap. Since Auspice 2.73.1 (2026-08-05), the slides of a narrative no longer show an empty tree when they change between trees without dates. See the [Auspice changelog](https://github.com/nextstrain/auspice/blob/ab4403f70284072efbd080a686d16205b5b53a27/CHANGELOG.md#version-300---20260902) for the versions from 2.73.1 to 3.0.0
- **Maps need WebGL**: MapLibre draws with WebGL, which the maps of Auspice 2 did not need. In a window without WebGL, for example when VS Code runs with hardware acceleration disabled, the viewer leaves the map out and shows a warning that names the cause
- **DOMPurify and uuid**: the viewer bundles DOMPurify 3.4.16 (2026-09-23), up from 3.4.12 (2026-07-11), which Auspice uses to remove unsafe HTML from the Markdown of datasets and narratives. The update fixes [GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7) and [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2). The copy of uuid is 11.1.1 (2026-04-29), which fixes [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

### Viewer

- **Only the tree at the start**: a viewer starts with only the tree, so that the map, entropy, frequency and measurements panels do not take its space. The sidebar has a toggle for each of them. The new `auspiceVscode.initialPanels` setting with the value `dataset` shows the panels that the dataset shows by default. Narratives show the panels of each slide
- **Folding sidebar**: a pull tab on the edge of the sidebar folds and unfolds it. Only the sidebar slides, and the panels take the new width once after the slide, so a large tree redraws once instead of on every frame. Before, a tab that moved between the top corners toggled the sidebar
- **Tree fits the editor**: the tree, map and measurements panels fill the height below the dataset title, so the x axis shows without scrolling
- **Auspice styles and the Lato font**: the viewer loads the stylesheets and the Lato font of Auspice. Before, it used the fonts of the system, made some elements too large (for example the symbols of filter sets), and showed notifications without styles
- **Sidebar**: the sidebar has the light colors of nextstrain.org and Nextclade, and its controls scroll only when they do not fit. A narrative shows its title in the row that Auspice keeps for it, so the fade no longer covers its first lines and the narrative toggle no longer covers the toolbar
- **Compact title**: the dataset title has a size of 18 to 22 pixels instead of 24 to 28 pixels, which leaves more height to the tree. In narrow tree panels, the download and zoom buttons wrap towards the right and no longer cover the title of the tree card
- **Full width**: the viewer fills the editor, without the strips of 20 pixels that VS Code adds at the left and right of a webview
- **Keyboard and screen readers**: the keyboard reaches the toggles of the sidebar, which show a focus ring. Enter and Space expand and collapse the panel sections. Selects, panel toggles and the buttons of filter badges have names that screen readers announce

### Tree

- **Labels inside the tree panel**: the margin for tip labels comes from the drawn width of the labels, so labels with wide letters (for example "W") are no longer cut at the right edge. Branch labels next to the root fit into the margin on the root side, also in the clock and scatter layouts. A branch label that does not fit into a quarter of the tree is hidden instead of cut. The x-axis labels at both ends, the axis titles, and the rate estimate of the clock layout stay whole, and grid labels at the top or bottom edge are hidden with their grid line
- **Redraw on resize**: when its panel changes size, for example when the sidebar folds, the tree redraws at once in the new size. Before, the tree showed at wrong positions for 700 ms
- **Two trees**: each tree of a tanglegram is clipped to its own panel. Before, the second tree was cut where its margins were different from those of the first tree, for example near its root when its tip names were shorter. SVG figures of two trees also had the same clip path for both trees
- **Narrow time axis**: a time axis narrower than one interval of the date grid no longer freezes the viewer. Long tip labels in a narrow tab could make the axis this short. See [auspice#2098](https://github.com/nextstrain/auspice/pull/2098)
- **Panels that close**: the tree and entropy panels remove their drawings when they close, and the tree stops its pending transitions and tip label timers, so that nothing draws over a panel that opens again. See [auspice#2100](https://github.com/nextstrain/auspice/pull/2100)
- **Console**: the console of the webview no longer logs a timer line on every update of the tree and the charts

### Documentation

- **VS Code version**: the extension page gives the minimum VS Code version that the extension needs, 1.74.0. Before, it gave 1.67.0

## 0.2.0

### Downloads

- **Download buttons**: the SVG, JSON and NWK buttons before the zoom buttons of the tree save the current view as a figure, an Auspice dataset, or a Newick tree
- **File names**: the save dialog proposes a file next to the dataset, named after it, for example `zika_view.svg` for `zika.json`. Before, it proposed `nextstrain_.svg` without a folder. Newick and TSV files have their own file types in the save dialog instead of `.txt`
- **Complete labels in SVG figures**: tip labels and axis labels near the edge of the tree panel are complete in SVG figures, which grow to hold them. Before, the figure cut them at the panel edge, also when the screen showed them
- **Grid layout in SVG figures**: SVG figures keep the grid layout of the panels. Before, they put the panels one below the other
- **Diversity bars below the visible area**: SVG figures contain the bars of the entropy chart also when the chart was below the visible area. Before, they contained the "data loading" text

### Tree

- **Tip label margin**: the margin for tip labels fits the longest label in view. Before, the first tip in view set the margin, so longer labels were cut on the screen and in downloads. See [auspice#2099](https://github.com/nextstrain/auspice/pull/2099)

## 0.1.2

- **Fewer redraws when panels change size**: the viewer gives Auspice at most one size change of its panels per frame, and none when the size stays the same. Auspice redraws every node of the tree on each size change, so repeated size changes slowed down large trees
- **Installation**: the extension page describes the installation from the Visual Studio Marketplace, from GitHub Releases, and from the command line

## 0.1.1

- **GitHub Releases**: each release also publishes its VSIX file on [GitHub Releases](https://github.com/ivan-aksamentov/auspice-vscode/releases). The extension is the same as 0.1.0

## 0.1.0

The first version, published on the Visual Studio Marketplace.

- **Auspice in VS Code**: the viewer embeds Auspice 2.73.0 (2026-07-07) and runs without a server in an editor tab. It reads the dataset files through the editor, and the files stay on your computer. Each dataset opens in its own tab, with its own state
- **Trees**: Auspice v2 JSON (`.auspice.json`, `.auspicejson`), Newick (`.new`, `.nwk`, `.newick`), and pairs of Auspice v1 files (`_meta.json` and `_tree.json`), also compressed with gzip
- **Sidecars**: the `_tip-frequencies`, `_measurements` and `_root-sequence` files next to a dataset attach automatically. The `auspiceVscode.companionDiscovery` setting turns this off
- **Metadata**: "Add Metadata to Current View" adds CSV, TSV, XLSX or node-data JSON files to the open view
- **Second tree and narratives**: "Compare with Another Tree" shows a second tree next to the first in a tanglegram, and "Open Local Narrative" shows a local Markdown narrative with the datasets that it uses
- **Sidebar**: the controls of Auspice for colors, filters, dates, animation, layout, labels and panels
- **Commands**: open a file in the viewer from the command palette, the context menu of the Explorer, or the button in the editor title, and switch between the viewer and the text editor. Other commands reload the view, show the input diagnostics and the attached input files, and open Taxonium, where you select the tree file yourself
- **Downloads**: the downloads of Auspice's download dialog open the save dialog of VS Code
- **File changes**: `auspiceVscode.staleFileBehavior` decides what an open viewer does when an input file changes: reload it, ask, or keep the view and mark it as stale
- **Settings**: `auspiceVscode.resourceLimitMiB` limits the size of the inputs, `auspiceVscode.sidebarInitialState` sets the sidebar state at the start, `auspiceVscode.preserveBackgroundViews` keeps the state of hidden tabs, `auspiceVscode.largeTreeTipAdvisory` sets the tip count above which the viewer warns about performance, and `auspiceVscode.zoom` sets the scale of the viewer. Maps are off unless `auspiceVscode.mapsEnabled` turns them on, because the map loads its tiles from other servers
- **Workspaces**: the extension works in untrusted and in virtual workspaces
