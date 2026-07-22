import { resolve } from "node:path"

import { run } from "./process.js"

const BUMPS = ["patch", "minor", "major"] as const

const extensionRoot = resolve(import.meta.dirname, "..")
const manifestPath = resolve(extensionRoot, "package.json")

const bump = process.argv[2] ?? "patch"
if (!isBump(bump)) {
  throw new Error(`Usage: bun run release <${BUMPS.join(" | ")}>`)
}

if (gitOutput(["status", "--porcelain"]) !== "") {
  throw new Error("Working tree is dirty. Commit or stash changes before releasing.")
}

const manifest = await readManifest(manifestPath)
const currentVersion = manifest.version
const nextVersion = bumpVersion(currentVersion, bump)
const tag = `v${nextVersion}`

await Bun.write(
  manifestPath,
  `${JSON.stringify({ ...manifest, version: nextVersion }, undefined, 2)}\n`,
)

run("git", ["add", "package.json"], { cwd: extensionRoot })
run("git", ["commit", "-m", `chore(release): ${tag}`], { cwd: extensionRoot })
run("git", ["tag", "-a", tag, "-m", tag], { cwd: extensionRoot })

process.stdout.write(
  `Bumped ${currentVersion} -> ${nextVersion} and tagged ${tag}.\nPush to trigger the release: git push --follow-tags\n`,
)

async function readManifest(path: string): Promise<Record<string, unknown> & { version: string }> {
  const raw: unknown = await Bun.file(path).json()
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("version" in raw) ||
    typeof raw.version !== "string"
  ) {
    throw new Error("package.json is missing a string version field.")
  }
  return { ...raw, version: raw.version }
}

function bumpVersion(current: string, kind: Bump): string {
  const parts = current.split(".").map((part) => Number.parseInt(part, 10))
  const [major, minor, patch] = parts
  if (
    parts.length !== 3 ||
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    throw new Error(`Cannot parse version "${current}" as major.minor.patch.`)
  }
  const next: Record<Bump, readonly [number, number, number]> = {
    major: [major + 1, 0, 0],
    minor: [major, minor + 1, 0],
    patch: [major, minor, patch + 1],
  }
  return next[kind].join(".")
}

function gitOutput(arguments_: readonly string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], { cwd: extensionRoot })
  if (result.exitCode !== 0) {
    throw new Error(`git ${arguments_.join(" ")} failed.`)
  }
  return result.stdout.toString().trim()
}

function isBump(value: string): value is Bump {
  return (BUMPS as readonly string[]).includes(value)
}

type Bump = (typeof BUMPS)[number]
