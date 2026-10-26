# Auspice panels stop the clicks on their links

## Problem

Auspice 3.1.0 closes the tip panel and the modals with a click on their gray backdrop. To keep a click inside a panel from closing it, the panel calls `stopPropagation()` on every click. A VS Code webview opens a link only from the click that reaches its window: VS Code's webview script listens for `click` on the window, sends the URL to VS Code, and cancels the click. The sandbox of the webview has no `allow-popups`, so a `target="_blank"` link that VS Code does not see opens nothing. The links of the tip panel (Accession, Genbank accession, GISAID EPI ISL, Strain URL) did nothing, while the links of the byline worked.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: the backdrop closes the panel only for a click on the backdrop itself (`closeOnBackdropClick()` in `src/components/tree/infoPanels/click.js`), and the panels let their clicks bubble. `src/components/modal/Modal.jsx` uses the same handler.

## Code

- Tip panel: [tree/infoPanels/click.js#L30-L34](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/infoPanels/click.js#L30-L34), [tree/infoPanels/click.js#L280-L281](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/infoPanels/click.js#L280-L281)
- Modal: [modal/Modal.jsx#L104-L105](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/modal/Modal.jsx#L104-L105)
- Link handling of VS Code webviews: `handleInnerClick()` in [webview/browser/pre/index.html](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/pre/index.html)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunks from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly. The browser scenario "lets the window open the links of the tip panel and closes the panel only outside it" in `scripts/test-browser.ts` fails when a new Auspice version stops the clicks again.
