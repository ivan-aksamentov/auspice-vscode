# Auspice never colors a second tree by genotype

## Problem

When a second tree is shown, as after the "Compare with Another Tree" command, Auspice 3.1.0 computes the genotypes of the second tree only when both trees have the same genome map (`metadata.identicalGenomeMapAcrossBothTrees`). `instantiateSecondTree()` calls `updateMetadataStateViaSecondTree()` with a copy of the metadata (`{...metadata}`) and discards the copy, so the flag is never set, and a coloring by genotype leaves the second tree in the color of missing values (`#ADB1B3`) even when both trees have the same `genome_annotations`.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: `instantiateSecondTree()` keeps the copy that the comparison marks and returns it, and `createStateFromQueryOrJSONs()` and `createTreeTooState()` take the metadata from the return value. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenario "colors the second tree by genotype" in `scripts/test-browser.ts` covers this fix.

## Code

- Discarded comparison: [actions/recomputeReduxState.js#L1154](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/recomputeReduxState.js#L1154)
- Returned metadata: [actions/recomputeReduxState.js#L1163](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/recomputeReduxState.js#L1163)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
