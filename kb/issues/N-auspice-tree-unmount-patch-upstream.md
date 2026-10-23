# Auspice tree keeps drawing after it unmounts

## Problem

Auspice 3.1.0's tree component removes its drawing when it unmounts, but the tree objects keep their pending drawing steps: staged transitions of an update, and the timers that draw tip labels. When a panel or a viewer closes during an update (for example, the user turns the tree panel off right after a change of the coloring), these steps run against a drawing that is no longer in the document.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: `componentWillUnmount()` calls a `dispose()` step on each tree object before the drawing is removed, which stops the staged transitions and the tip label timers. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

## Code

- `TreeComponent.componentWillUnmount()`: removes the drawing ([tree/tree.tsx#L81-L86](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/tree.tsx#L81-L86))

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.

## Editing the patch

The patch is a Git diff against the published Auspice package. Among others, it makes the extension registry of Auspice (`src/util/extensions.ts`) import the `@extensions` module, which `scripts/build-client.ts` resolves to `src/auspice-client/extensions-registry.tsx`, because Bun has no counterpart of the `require.context("@extensions")` of the stock registry.

Write the patch from two copies of the published package. `bun patch --commit` is not used, because it copies Bun's `.bun-tag-*` marker files from `node_modules/auspice` into the patch.

1. Run `npm pack auspice@<version>` in a scratch directory, and extract the archive twice: `base/` and `edit/`
2. In `base/`, run `git init`, `git add -A` and `git commit`
3. In `edit/`, apply the current patch with `patch -p1 < <auspice-vscode>/patches/auspice@<version>.patch`, and edit the files. For a new Auspice version, start from Nextclade's `packages/nextclade-web/patches/auspice@<version>.patch`, which holds the shared hunks, and add the hunks of auspice-vscode
4. Copy `edit/src/` over `base/src/`, and in `base/` write the patch with `git diff --full-index > <auspice-vscode>/patches/auspice@<version>.patch`. Check that `grep -c bun-tag` finds nothing in it
5. Set the `auspice` version and the `patchedDependencies` entry in `package.json`, delete `node_modules/auspice`, and run `bun install`. Check that the files in `node_modules/auspice/src` contain the change

Bun installs a patched package from its cache (the directory that `bun pm cache` prints, entries `auspice@<version>@@@1_patch_hash=*`) and links its files into `node_modules`. Never edit a file in `node_modules/auspice` in place: the edit changes the cached copy too, and a later `bun install` brings it back. Copy a file over to try a change, or delete the cache entries of the patched package after such an edit and install again.
