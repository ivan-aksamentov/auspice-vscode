# Auspice cuts or misplaces tree labels

## Problem

Auspice 3.1.0 cuts or misplaces several labels of the tree drawing:

- **Branch labels near the root**: in the rectangular, clock and scatter layouts, each branch label ends 5 px before its node on the root side. The margin on that side is 5 px (40 px in the clock and scatter layouts), so the label of a branch that starts near the root is wider than the space before its node, and its beginning is cut off
- **Tip label margin**: the margin on the tip side is estimated from the number of characters of the labels, so it is too narrow for labels with wide letters (e.g. "W") and too wide for narrow ones, and it is reserved only while fewer than 75 tips are in view
- **Grid and axis labels**: x-axis labels are centered on their grid line, so the labels of grid lines near the left or right edge are cut off, and so are labels at the top or bottom edge. The baseline of the x-axis title sits 1 px above the bottom edge, which cuts its descenders, and the upright y-axis title can extend past the left edge
- **Clock regression text**: the rate estimate is placed at a fixed offset and can extend past a narrow tree
- **Narrow time axis**: when long tip labels leave a time axis narrower than the spacing of date grid lines (130 px), Auspice divides the time range by zero grid intervals and steps towards a date it never reaches, which freezes the viewer

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: labels are measured with the font of the tree, the margin on the root side grows just enough for the visible branch labels (at most a quarter of the tree width; a label that still does not fit is hidden), the clip area covers that margin, the tip side is sized from the labels of the visible tips, grid and axis labels are aligned, hidden or moved to stay whole, and the rate estimate is centered and set smaller where it is wider than the tree. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenarios on tip, branch and axis labels in `scripts/test-browser.ts` (for example "fits branch labels near the root and the outermost axis labels inside the tree panel") cover these fixes.

## Code

- Left margin: [tree/phyloTree/layouts.ts#L351](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/layouts.ts#L351)
- Tip label margin: [tree/phyloTree/layouts.ts#L631-L655](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/layouts.ts#L631-L655)
- Branch label position: [tree/phyloTree/labels.js#L149-L151](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/labels.js#L149-L151)
- Clip area start: [tree/phyloTree/renderers.ts#L516](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/renderers.ts#L516)
- Grid label position: [tree/phyloTree/grid.js#L387](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/grid.js#L387)
- Upright y-axis title: [tree/phyloTree/grid.js#L427](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/grid.js#L427)
- Rate estimate position: [tree/phyloTree/renderers.ts#L403](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/renderers.ts#L403)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
