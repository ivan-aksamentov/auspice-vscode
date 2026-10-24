import { resolve } from "node:path"

import { releaseNotes } from "./changelog.js"

// Print the notes of a CHANGELOG.md section, e.g. `0.4.0` or `Unreleased`. The release workflow
// publishes them as the notes of the GitHub release, and fails when the section is missing.

const extensionRoot = resolve(import.meta.dirname, "..")

const title = process.argv[2]
if (title === undefined) {
  throw new Error("Usage: bun run release:notes <version | Unreleased>")
}

const changelog = await Bun.file(resolve(extensionRoot, "CHANGELOG.md")).text()
process.stdout.write(releaseNotes(changelog, title))
