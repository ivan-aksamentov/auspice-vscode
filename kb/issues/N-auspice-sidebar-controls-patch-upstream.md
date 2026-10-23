# Auspice sidebar controls lack keyboard access and names

## Problem

- **Keyboard**: Auspice 3.1.0 hides the checkbox of each toggle with `display: none`, so the keyboard skips all toggles (such as "Show all labels" and the panel toggles). Panel section headers and the buttons of filter badges react to clicks only
- **Names**: selects, panel toggles and filter badge buttons have no accessible names, so screen readers and tests cannot tell them apart
- **Toggle height**: a toggle container has a fixed height of 21 px, and some toggles add padding through their `style` prop. Pages that size all boxes as `border-box` (Bootstrap) shrink the toggle instead, and its label overlaps the next control

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: the checkbox of a toggle stays in place, invisible and focusable, with a focus ring on the slider; panel headers and filter badge buttons react to Enter and Space; the controls get names; and the toggle container keeps `content-box` sizing. Most of these hunks belong to the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change them in all four patches together. auspice-vscode adds names to three selects that the other viewers do not show: "Second Tree", "Language", and the "Collections" and "Group By" selects of the measurements panel.

The browser scenario "switches branch labels and panel options by keyboard" in `scripts/test-browser.ts` covers the keyboard access.

## Code

- Hidden checkbox: [controls/toggle.js#L17-L19](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/toggle.js#L17-L19)
- Toggle container: [controls/toggle.js#L6-L10](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/toggle.js#L6-L10)
- Panel header: [controls/panelHeader.tsx#L45-L49](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/panelHeader.tsx#L45-L49)
- Filter badge buttons: [info/filterBadge.js#L109-L117](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/info/filterBadge.js#L109-L117)
- Selects of auspice-vscode only: [controls/choose-second-tree.js#L53](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/choose-second-tree.js#L53), [controls/language.js#L65](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/language.js#L65), [controls/measurementsOptions.tsx#L66](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/measurementsOptions.tsx#L66), [controls/measurementsOptions.tsx#L83](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/controls/measurementsOptions.tsx#L83)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
