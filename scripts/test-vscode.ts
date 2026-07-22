import { resolve } from "node:path"

import { buildVsCodeTests } from "./build-vscode-tests.js"
import { build } from "./build.js"
import { run } from "./process.js"

const extensionRoot = resolve(import.meta.dirname, "..")

run("bun", ["run", "typecheck"], { cwd: extensionRoot })
await build()
await buildVsCodeTests()
run("bun", ["test/vscode/run.ts"], {
  cwd: extensionRoot,
  env: headlessEnvironment(),
})

function headlessEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== "DISPLAY" && name !== "WAYLAND_DISPLAY",
    ),
  )
  return {
    ...environment,
    AUSPICE_VSCODE_TEST_DISPLAY: "isolated",
  }
}
