import { mkdir, readdir, rm, symlink } from "node:fs/promises"
import { homedir } from "node:os"
import { resolve } from "node:path"

const extensionRoot = resolve(import.meta.dirname, "..")
const manifestPath = resolve(extensionRoot, "package.json")

export async function linkVscode(): Promise<void> {
  const manifest = await readManifest()
  const extensionId = `${manifest.publisher}.${manifest.name}`
  const extensionsDirectory = resolve(
    process.env["VSCODE_EXTENSIONS_DIR"] ?? resolve(homedir(), ".vscode", "extensions"),
  )
  const linkPath = resolve(extensionsDirectory, extensionId)

  await mkdir(extensionsDirectory, { recursive: true })
  const directoryEntries = await readdir(extensionsDirectory, { withFileTypes: true })
  const entries = directoryEntries.filter((entry) => isExtensionEntry(entry.name, extensionId))
  const conflicts = entries.filter((entry) => !entry.isSymbolicLink())
  if (conflicts.length > 0) {
    const paths = conflicts.map((entry) => resolve(extensionsDirectory, entry.name)).join("\n")
    throw new Error(
      `Cannot link ${extensionId} while installed extension entries exist:\n${paths}\nUninstall them through VS Code, then run this command again.`,
    )
  }

  await Promise.all(
    entries.map((entry) => rm(resolve(extensionsDirectory, entry.name), { force: true })),
  )
  await symlink(extensionRoot, linkPath, process.platform === "win32" ? "junction" : "dir")

  process.stdout.write(
    `Linked ${linkPath} -> ${extensionRoot}\nRun “Developer: Reload Window” in VS Code to load the build.\n`,
  )
}

interface ExtensionManifest {
  readonly name: string
  readonly publisher: string
}

async function readManifest(): Promise<ExtensionManifest> {
  const manifest: unknown = await Bun.file(manifestPath).json()
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("name" in manifest) ||
    typeof manifest.name !== "string" ||
    !("publisher" in manifest) ||
    typeof manifest.publisher !== "string"
  ) {
    throw new Error("package.json is missing string name or publisher fields.")
  }
  return { name: manifest.name, publisher: manifest.publisher }
}

function isExtensionEntry(name: string, extensionId: string): boolean {
  return name === extensionId || name.startsWith(`${extensionId}-`)
}

if (import.meta.main) await linkVscode()
