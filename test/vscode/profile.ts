import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const ISOLATED_DISPLAY_VARIABLE = "AUSPICE_VSCODE_TEST_DISPLAY"
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u
const TEST_MACHINE_ARGUMENTS = {
  "enable-crash-reporter": false,
}
const TEST_SETTINGS = {
  "auspiceVscode.mapsEnabled": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": "off",
  "extensions.ignoreRecommendations": true,
  "telemetry.enableCrashReporter": false,
  "telemetry.enableTelemetry": false,
  "telemetry.telemetryLevel": "off",
  "update.showReleaseNotes": false,
  "window.restoreWindows": "none",
  "workbench.editor.enablePreview": false,
  "workbench.editor.enablePreviewFromQuickOpen": false,
  "workbench.editor.showTabs": "multiple",
  "workbench.enableExperiments": false,
  "workbench.list.openMode": "doubleClick",
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
}

export function createVsCodeTestProfile(extensionRoot: string, version: string): VsCodeTestProfile {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid VS Code test version "${version}".`)
  }

  const rootPath = resolve(extensionRoot, ".build", "vscode-runtime", version)
  const userDataPath = resolve(rootPath, "user-data")
  const extensionsPath = resolve(rootPath, "extensions")
  const homePath = resolve(rootPath, "home")
  const temporaryPath = resolve(rootPath, "tmp")
  const xdgCachePath = resolve(rootPath, "xdg", "cache")
  const xdgConfigPath = resolve(rootPath, "xdg", "config")
  const xdgDataPath = resolve(rootPath, "xdg", "data")
  const xdgRuntimePath = resolve(rootPath, "xdg", "runtime")
  const xdgStatePath = resolve(rootPath, "xdg", "state")

  return {
    rootPath,
    machineArgumentsPath: resolve(rootPath, "argv.json"),
    settingsPath: resolve(userDataPath, "User", "settings.json"),
    writablePaths: [
      extensionsPath,
      homePath,
      temporaryPath,
      xdgCachePath,
      xdgConfigPath,
      xdgDataPath,
      xdgRuntimePath,
      xdgStatePath,
    ],
    environment: {
      AUSPICE_EXTENSION_ROOT: extensionRoot,
      APPDATA: resolve(rootPath, "app-data"),
      HOME: homePath,
      LOCALAPPDATA: resolve(rootPath, "local-app-data"),
      TEMP: temporaryPath,
      TMP: temporaryPath,
      TMPDIR: temporaryPath,
      USERPROFILE: homePath,
      VSCODE_PORTABLE: rootPath,
      XDG_CACHE_HOME: xdgCachePath,
      XDG_CONFIG_HOME: xdgConfigPath,
      XDG_DATA_HOME: xdgDataPath,
      XDG_RUNTIME_DIR: xdgRuntimePath,
      XDG_STATE_HOME: xdgStatePath,
    },
    launchArguments: [
      `--extensions-dir=${extensionsPath}`,
      `--user-data-dir=${userDataPath}`,
      "--disable-crash-reporter",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-telemetry",
      "--disable-workspace-trust",
      "--ozone-platform=headless",
      "--skip-welcome",
      "--use-inmemory-secretstorage",
    ],
    machineArguments: TEST_MACHINE_ARGUMENTS,
    settings: TEST_SETTINGS,
  }
}

export async function resetVsCodeTestProfile(profile: VsCodeTestProfile): Promise<void> {
  await rm(profile.rootPath, { recursive: true, force: true })
  await Promise.all([
    mkdir(dirname(profile.machineArgumentsPath), { recursive: true, mode: 0o700 }),
    mkdir(dirname(profile.settingsPath), { recursive: true, mode: 0o700 }),
    ...profile.writablePaths.map((path) => mkdir(path, { recursive: true, mode: 0o700 })),
  ])
  await Promise.all([
    writeJson(profile.machineArgumentsPath, profile.machineArguments),
    writeJson(profile.settingsPath, profile.settings),
  ])
}

export function requireIsolatedTestDisplay(
  environment: Readonly<Record<string, string | undefined>>,
): void {
  if (environment[ISOLATED_DISPLAY_VARIABLE] === "isolated") return
  throw new Error(
    `VS Code integration tests require an isolated desktop. Run them inside a virtual display and set ${ISOLATED_DISPLAY_VARIABLE}=isolated in that environment.`,
  )
}

export interface VsCodeTestProfile {
  readonly rootPath: string
  readonly machineArgumentsPath: string
  readonly settingsPath: string
  readonly writablePaths: readonly string[]
  readonly environment: Readonly<Record<string, string>>
  readonly launchArguments: string[]
  readonly machineArguments: Readonly<Record<string, boolean>>
  readonly settings: Readonly<Record<string, boolean | string>>
}

async function writeJson(
  path: string,
  value: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, undefined, 2)}\n`, "utf8")
}
