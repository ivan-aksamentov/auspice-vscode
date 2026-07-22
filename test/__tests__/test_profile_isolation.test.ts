import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import { createVsCodeTestProfile, requireIsolatedTestDisplay } from "../vscode/profile"

describe("VS Code test profile isolation", () => {
  test("test_profile_places_all_writable_state_under_versioned_portable_root", () => {
    const extensionRoot = resolve("fixtures", "extension")
    const rootPath = resolve(extensionRoot, ".build", "vscode-runtime", "1.125.0")

    const actual = createVsCodeTestProfile(extensionRoot, "1.125.0")

    expect(actual).toEqual({
      rootPath,
      machineArgumentsPath: resolve(rootPath, "argv.json"),
      settingsPath: resolve(rootPath, "user-data", "User", "settings.json"),
      writablePaths: [
        resolve(rootPath, "extensions"),
        resolve(rootPath, "home"),
        resolve(rootPath, "tmp"),
        resolve(rootPath, "xdg", "cache"),
        resolve(rootPath, "xdg", "config"),
        resolve(rootPath, "xdg", "data"),
        resolve(rootPath, "xdg", "runtime"),
        resolve(rootPath, "xdg", "state"),
      ],
      environment: {
        AUSPICE_EXTENSION_ROOT: extensionRoot,
        APPDATA: resolve(rootPath, "app-data"),
        HOME: resolve(rootPath, "home"),
        LOCALAPPDATA: resolve(rootPath, "local-app-data"),
        TEMP: resolve(rootPath, "tmp"),
        TMP: resolve(rootPath, "tmp"),
        TMPDIR: resolve(rootPath, "tmp"),
        USERPROFILE: resolve(rootPath, "home"),
        VSCODE_PORTABLE: rootPath,
        XDG_CACHE_HOME: resolve(rootPath, "xdg", "cache"),
        XDG_CONFIG_HOME: resolve(rootPath, "xdg", "config"),
        XDG_DATA_HOME: resolve(rootPath, "xdg", "data"),
        XDG_RUNTIME_DIR: resolve(rootPath, "xdg", "runtime"),
        XDG_STATE_HOME: resolve(rootPath, "xdg", "state"),
      },
      launchArguments: [
        `--extensions-dir=${resolve(rootPath, "extensions")}`,
        `--user-data-dir=${resolve(rootPath, "user-data")}`,
        "--disable-crash-reporter",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-telemetry",
        "--disable-workspace-trust",
        "--ozone-platform=headless",
        "--skip-welcome",
        "--use-inmemory-secretstorage",
      ],
      machineArguments: {
        "enable-crash-reporter": false,
      },
      settings: {
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
      },
    })
  })

  test("test_profile_rejects_version_path_injection", () => {
    expect(() => createVsCodeTestProfile("/extension", "../../home")).toThrow(
      'Invalid VS Code test version "../../home".',
    )
  })

  test("test_profile_refuses_unmarked_desktop", () => {
    expect(() => requireIsolatedTestDisplay({})).toThrow(
      "VS Code integration tests require an isolated desktop.",
    )
  })

  test("test_profile_accepts_marked_isolated_desktop", () => {
    expect(() =>
      requireIsolatedTestDisplay({ AUSPICE_VSCODE_TEST_DISPLAY: "isolated" }),
    ).not.toThrow()
  })
})
