# Auspice entropy chart is drawn twice under React StrictMode

## Problem

Auspice 3.1.0's entropy panel draws its chart in `setUp()` and stores the chart object later through `setState({chart})`. `componentWillUnmount()` removes the drawing only `if (this.state.chart)`. React StrictMode unmounts and mounts each component once more right after the first mount, while the state does not hold the chart yet, so the drawing stays, and the second mount draws a second chart over it. The `IntersectionObserver` that the panel starts in `componentDidMount()` is never disconnected either.

auspice-vscode renders without StrictMode, so its viewer does not show the double chart. auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: `componentWillUnmount()` disconnects the observer and removes the drawing from the DOM without the check. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenario "draws one entropy chart after its panel is turned off and on" in `scripts/test-browser.ts` checks that the panel holds one chart.

## Code

- `Entropy.componentWillUnmount()`: [entropy/index.js#L337-L341](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/entropy/index.js#L337-L341)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
