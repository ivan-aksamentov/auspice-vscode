# Auspice lacks hooks for apps that embed its components

## Problem

auspice-vscode renders Auspice components in a VS Code webview and bundles the Auspice sources with Bun (`scripts/build-client.ts`). Auspice 3.1.0 assumes its own app, server and build in several places:

- **Extensions registry**: Auspice reads its extensions from a build-time `EXTENSION_DATA` variable and loads them through webpack's `require.context("@extensions")`. The patch imports the registry from the `@extensions` module, which the build resolves to `src/auspice-client/extensions-registry.tsx`. `getExtension()` also returns registered values that are falsy, such as `false` (shared)
- **File names**: Auspice names downloads after the page address, which a webview does not have. `getFilePrefix()` returns the `filePrefix` extension when it is registered, and the save dialog of the extension adds the dataset name
- **Downloads**: Auspice writes a download through a link with a `download` attribute, which a VS Code webview ignores. `write()` dispatches an `auspice-export` event with the file name, media type and content, which `src/auspice-client/bridge.ts` posts to the extension host
- **Figure caption**: the SVG download writes the text lines of a nextstrain.org dataset below the figure: its address, data use terms and the CC-BY license. The patch adds a `caption` parameter to the asynchronous `SVG()` that replaces these lines (shared); auspice-vscode writes the caption of `src/auspice-client/svgCaption.ts`
- **Download modal**: Auspice's download modal offers the downloads of nextstrain.org datasets. With the `downloadModal` extension set to `false`, as auspice-vscode sets it, the "d" key opens nothing (shared), and the fine print has no "Download data" link. The fine print also separates its parts with dots only between parts, so a dataset without an update date gets no leading dot
- **Kept view**: once the tree is drawn, Auspice keeps the zoom on the drawn nodes only. A new drawing of the same nodes takes the zoom from the previous drawing, so that a tree panel that the user turns off and on keeps its zoomed clade (shared)

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`.

The browser scenarios "writes a local caption below the SVG export and opens no download modal" and "keeps the zoomed clade when the tree panel is turned off and on" in `scripts/test-browser.ts` cover the caption, the modal and the kept view.

## Code

- Extensions registry: [util/extensions.ts#L7-L35](https://github.com/nextstrain/auspice/blob/v3.1.0/src/util/extensions.ts#L7-L35)
- File names: [download/downloadButtons.js#L155](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/downloadButtons.js#L155)
- File writing: [download/helperFunctions.js#L153-L164](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L153-L164)
- SVG download entry: [download/helperFunctions.js#L789](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/download/helperFunctions.js#L789)
- Download modal key: [modal/Modal.jsx#L29](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/modal/Modal.jsx#L29)
- Fine print: [framework/fine-print.js#L113-L125](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/framework/fine-print.js#L113-L125)
- Zoom of a new drawing: [tree/phyloTree/phyloTree.ts#L39](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/phyloTree/phyloTree.ts#L39)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
