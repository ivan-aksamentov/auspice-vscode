# Auspice tree and legend clip areas share one element ID

## Problem

In Auspice 3.1.0, every tree object creates a `<clipPath>` with the fixed ID `treeClip`, and all branch, tip, label and grid groups clip to `url(#treeClip)`. Element IDs are unique per document, and the browser resolves a duplicated ID to the first element. When two trees are shown, as after the "Compare with Another Tree" command, both trees clip to the clip area of the tree drawn first, and the SVG download writes both clip areas under one ID.

Every legend clips its first column to the clip area `legendFirstColumnClip`. The tree and the map each show a legend, so the second legend clips to the area of the first.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: the clip ID of a tree comes from the tree ID (`treeClip-LEFT`, `treeClip-RIGHT`), and each legend instance has its own clip ID. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenarios "clips each tree of a tanglegram to its own panel" and "gives the tree legend and the map legend their own clip paths" in `scripts/test-browser.ts` cover both.

## Code

- Clip area creation: [tree/phyloTree/renderers.ts#L524](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/renderers.ts#L524)
- Clip references: [tree/phyloTree/renderers.ts#L224](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/renderers.ts#L224), [tree/phyloTree/labels.js#L138](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/labels.js#L138), [tree/phyloTree/grid.js#L36-L39](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/grid.js#L36-L39)
- Legend clip area: [legend/legend.tsx#L220](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/legend/legend.tsx#L220), [legend/legend.tsx#L234](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/legend/legend.tsx#L234)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
