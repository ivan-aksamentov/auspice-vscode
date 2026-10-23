export function run(
  command: string,
  arguments_: readonly string[],
  options: { readonly cwd: string; readonly env?: NodeJS.ProcessEnv },
): void {
  const result = Bun.spawnSync([command, ...arguments_], {
    cwd: options.cwd,
    ...(options.env === undefined ? {} : { env: options.env }),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  if (result.exitCode !== 0) {
    throw new Error(`${command} exited with status ${result.exitCode}.`)
  }
}

/** Run the command and return its standard output */
export function runOutput(command: string, arguments_: readonly string[]): Uint8Array {
  const result = Bun.spawnSync([command, ...arguments_], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "inherit",
  })
  if (result.exitCode !== 0) {
    throw new Error(`${command} exited with status ${result.exitCode}.`)
  }
  return result.stdout
}
