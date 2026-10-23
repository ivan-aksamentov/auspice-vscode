# Auspice offers a time axis for trees where only some nodes have dates

## Problem

Auspice 3.1.0 offers the time metric, the clock layout and the date controls when the root node of the tree has a date (`num_date`). Nextclade places sequences onto dated reference trees and writes them without dates, and auspice-vscode opens Nextclade's output `nextclade.auspice.json`. On such trees Auspice offered the time view and placed none of the undated sequences on the time axis: their positions were not numbers, so the sequences were missing from the drawing.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: Auspice offers the time axis only when every node of the main tree and of the second tree has a date. Trees with undated nodes are shown by divergence, with no time metric, clock layout or date controls. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenario "draws every tip of a partly dated tree by divergence" in `scripts/test-browser.ts` covers this fix.

## Code

- Time axis availability: [actions/recomputeReduxState.js#L476-L480](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/recomputeReduxState.js#L476-L480)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
