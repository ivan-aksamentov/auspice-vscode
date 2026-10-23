# Auspice map fails when it is mounted again

## Problem

The viewer mounts the Auspice 3.1.0 map when the user turns its panel on, and unmounts it when the user turns it off. The map component assumes that it is mounted once per page load:

- **Stale export**: the map sets `window.L.getMapSvg`, the function that the SVG download uses, only once, and the function keeps the first map instance. After the map is mounted again, the download reads the detached first map and writes an empty map
- **Crash on early unmount**: the Leaflet map is created on the first update, but `componentWillUnmount()` reads it without a check, so an unmount before that update throws `Cannot read properties of null (reading 'off')`
- **Leaked resources**: `componentWillUnmount()` removes only two event handlers. It does not remove the Leaflet map, which holds a WebGL context, nor its timers

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: each mount registers the export function of its own instance and removes it on unmount when it still belongs to that instance; the cleanup after an unmount removes the Leaflet map and clears the timers, and works when the map was never created; the SVG download leaves the map out while no map has registered its export function. This hunk is one of the Auspice fixes that Nextclade, treetime.rs, treeknit-rs and auspice-vscode carry in their patches with the same code, so that the four viewers behave the same; change it in all four patches together.

The browser scenario "exports the map after its panel is turned off and on" in `scripts/test-browser.ts` covers this fix.

## Code

- Export function: [map/map.js#L106-L140](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/map/map.js#L106-L140)
- Unmount: [map/map.js#L737-L740](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/map/map.js#L737-L740)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
