import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"

import { run } from "./process.js"

const extensionRoot = resolve(import.meta.dirname, "..")

export async function buildVsCodeTests(): Promise<void> {
  const outputRoot = resolve(extensionRoot, ".build", "vscode-tests")
  await mkdir(outputRoot, { recursive: true })
  run(
    "bun",
    [
      "build",
      resolve(extensionRoot, "test", "vscode", "suite.ts"),
      "--target=node",
      "--format=cjs",
      "--external=vscode",
      `--outfile=${resolve(outputRoot, "suite.cjs")}`,
    ],
    { cwd: extensionRoot },
  )
}

if (import.meta.main) await buildVsCodeTests()
