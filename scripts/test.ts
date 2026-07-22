import { resolve } from "node:path"

import { run } from "./process.js"

const extensionRoot = resolve(import.meta.dirname, "..")

run("bun", ["test", "test/__tests__"], { cwd: extensionRoot })
run("bun", ["run", "build:client"], { cwd: extensionRoot })
run("bun", ["run", "test:browser"], { cwd: extensionRoot })
await import("./test-vscode.js")
