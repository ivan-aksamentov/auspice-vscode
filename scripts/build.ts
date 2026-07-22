import { rm } from "node:fs/promises"
import { resolve } from "node:path"

import { buildClient } from "./build-client.js"
import { run } from "./process.js"

const extensionRoot = resolve(import.meta.dirname, "..")

export async function build(): Promise<void> {
  await rm(resolve(extensionRoot, "dist"), { recursive: true, force: true })
  run("bun", ["run", "build:extension"], { cwd: extensionRoot })
  await buildClient()
}

if (import.meta.main) await build()
