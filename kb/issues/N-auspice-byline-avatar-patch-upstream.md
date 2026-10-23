# Auspice byline loads the avatar of the dataset maintainer from GitHub

## Problem

Auspice 3.1.0's byline shows an avatar next to the maintainers of a dataset. For a dataset whose `buildUrl` is a GitHub repository, it loads the avatar of the repository owner from `https://github.com/<owner>.png`. The webview's Content Security Policy allows images only from the extension and from `data:` URLs, so the avatar showed as a broken image, and the request would send the repository owner of a local dataset to GitHub.

auspice-vscode fixes this in the Bun patch of Auspice, `patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `package.json`: the byline shows only an avatar that the dataset embeds as a `data:` URL.

## Code

- Avatar of the build: [info/byline.js#L39-L54](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/info/byline.js#L39-L54)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice) later. After an upgrade to an Auspice release that contains it, remove the hunk from the patch, as `N-auspice-tree-unmount-patch-upstream.md` describes in "Editing the patch". The patch file also holds the hunks of the other `N-auspice-*-patch-upstream.md` issues. When it has none left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
