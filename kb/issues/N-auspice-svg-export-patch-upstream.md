# Auspice SVG download cuts labels, misses off-screen charts, and shrinks at a viewer scale

## Problem

The SVG download of Auspice 3.1.0, which the viewer offers as the "SVG" button above the tree, writes each panel as a nested `<svg>` of the panel's size, with `overflow="hidden"` and a `<clipPath>` of the panel's box:

- Tree labels that extend past the tree panel, such as long tip labels or axis labels at its edge, are cut off in the downloaded image, although the viewer shows them
- The entropy chart computes its bars only while it is on screen. Below the fold, the downloaded image shows the chart without bars
- Text after an inline element loses its leading space: the export writes each HTML text node as an SVG `<text>` at the position of its first character, and SVG drops a leading space, so a caption line such as "Map: <a>Natural Earth</a> 5.1.2" read "Natural Earth5.1.2"
- The legends and the map are read back from the page with `getBoundingClientRect()`, which includes CSS transforms of the page. auspice-vscode scales its viewer against the zoom of the VS Code window (setting `auspiceVscode.zoom`), so at a scale of 0.8 the exported legends and the map shrank to 80 %, while fonts and panels kept their size

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`. The first part belongs to the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code; change it in all four patches together: the download measures the labels of each tree panel, drops labels that are anchored outside the panel, gives the panel `overflow="visible"` and a clip path of the box of the panel and its labels, widens the image with a `viewBox` that holds the boxes, and computes the entropy bars before writing the image when the chart has none. Only in auspice-vscode: each exported text line starts at its first visible character, and `htmlToSvg()`, the tree labels and the legend offsets convert client rects to layout pixels by the scale at which the page draws them.

The browser scenarios "keeps long tip labels in the SVG export and names the downloads", "draws the Natural Earth basemap from the files of the extension", "exports the genetic diversity bars of a panel below the fold" and "keeps the labels and the legend of the SVG export inside the figure at a viewer scale of 0.8" in `scripts/test-browser.ts` cover these fixes.

## Code

- Panel serialization: [download/helperFunctions.js#L427](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L427)
- Panel clipping: [download/helperFunctions.js#L568-L580](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L568-L580)
- Legend offsets: [download/helperFunctions.js#L626-L645](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L626-L645)
- Text lines: [download/domToSvg.js#L100-L145](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/domToSvg.js#L100-L145)
- Client rects of a block: [download/domToSvg.js#L328-L334](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/domToSvg.js#L328-L334)
- SVG download entry: [download/helperFunctions.js#L789](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L789)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
