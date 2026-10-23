# Auspice redraws the lines between two trees with a stale timer

## Problem

When two trees are shown, Auspice 3.1.0 draws lines between their tips (the tanglegram). After a change of either tree, it removes the lines and draws them again after 1 s, through a timer that it keeps in `this.timeout`. The timer is never reset after it fires and never cleared: after the second resize, the old lines stay for 1 s, and a redraw that is still pending when the trees close draws into an SVG that is gone.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: the timer resets `this.timeout` when it fires, and `componentWillUnmount()` clears a pending timer. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

## Code

- Redraw timer: [tree/tangle/index.js#L72-L81](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/tangle/index.js#L72-L81)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
