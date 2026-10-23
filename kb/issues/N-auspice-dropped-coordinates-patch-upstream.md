# Auspice reads the coordinates of added metadata wrongly

## Problem

Auspice 3.1.0 turns a metadata file with `latitude` and `longitude` (or `__latitude` and `__longitude`) columns into a map of the samples. In auspice-vscode such files come from the "Add Metadata to Current View" command or are dropped on the viewer. The parser has these defects:

- **Coordinates-only files**: a file whose only columns besides the names are the coordinates is refused with "No valid columns", because the check for other columns runs before the coordinates are read
- **Merged locations**: samples are grouped by the joined strings of their coordinates, so `(1, 23)` and `(12, 3)` are one location
- **Empty cells**: an empty latitude or longitude is read as 0, so the sample is placed at `(0, 0)`
- **Missing legend placement**: the placements of the legends are computed from the panels of the dataset when it loads. When a dataset without a map gets coordinates, the map has no legend placement, and its legend fails with "Cannot read properties of undefined (reading 'horizontal')"

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: coordinates alone make a valid file, samples are grouped by their parsed coordinates, rows with an empty coordinate and rows of names that are not in the tree are skipped, and the metadata update adds the legend placement of a map that it makes available. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenario "maps added coordinates that share their digits to separate places" in `scripts/test-browser.ts` covers these fixes.

## Code

- Column check: [actions/filesDropped/parseCsv.ts#L81](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/filesDropped/parseCsv.ts#L81)
- Coordinate grouping: [actions/filesDropped/parseCsv.ts#L313-L318](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/filesDropped/parseCsv.ts#L313-L318)
- Legend placements: [util/metadataJsonParsing.ts#L113](https://github.com/nextstrain/auspice/blob/v3.1.0/src/util/metadataJsonParsing.ts#L113)
- Geographic metadata update: [actions/updateMetadata/updateMetadata.ts#L182-L189](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/updateMetadata/updateMetadata.ts#L182-L189)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
