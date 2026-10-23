# Auspice entropy chart crowds its genome axes in narrow panels

## Problem

Auspice 3.1.0 asks d3 for 16 ticks on the main genome axis of the entropy chart and 20 on the navigation axis below it, whatever the chart width. In a narrow editor pane, the labels (such as "28,000") run into each other and cannot be read.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: each axis asks for one tick per 60 px of its width, at most the numbers above. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

## Code

- Axis ticks: [entropy/entropyD3.js#L627-L630](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/entropy/entropyD3.js#L627-L630)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
