import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"

import { runTests } from "@vscode/test-electron"

import {
  createVsCodeTestProfile,
  requireIsolatedTestDisplay,
  resetVsCodeTestProfile,
} from "./profile"

const extensionRoot = resolve(import.meta.dirname, "..", "..")
const cachePath = resolve(extensionRoot, ".build", "vscode")
const extensionTestsPath = resolve(extensionRoot, ".build", "vscode-tests", "suite.cjs")
const versions = ["1.125.0", "1.128.0"]

requireIsolatedTestDisplay(process.env)
await mkdir(cachePath, { recursive: true })
await versions.reduce(
  (previous, version) => previous.then(() => runVersion(version)),
  Promise.resolve(),
)

async function runVersion(version: string): Promise<void> {
  const profile = createVsCodeTestProfile(extensionRoot, version)
  await resetVsCodeTestProfile(profile)
  await runTests({
    version,
    cachePath,
    extensionDevelopmentPath: extensionRoot,
    extensionTestsPath,
    extensionTestsEnv: profile.environment,
    launchArgs: profile.launchArguments,
  })
}
