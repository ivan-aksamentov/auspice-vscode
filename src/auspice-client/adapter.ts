import { Dataset } from "@auspice/actions/loadData"
import type { DatasetInstance } from "@auspice/actions/loadData"
import { createStateFromQueryOrJSONs } from "@auspice/actions/recomputeReduxState"

import type { MainInput, ParsedInputs, ViewerDiagnostic } from "./input"
import { applyInitialPanels, applyMapSetting, canDrawMaps } from "./panelSettings"
import type { InitialPanels } from "./panelSettings"
import { setViewerSettings, store } from "./store"

export function loadIntoAuspice(
  inputs: ParsedInputs,
  largeTreeTipAdvisory: number,
  sidebarInitialState: "open" | "closed" | "dataset",
  initialPanels: InitialPanels,
  locale: string,
  isCurrent: () => boolean,
): readonly ViewerDiagnostic[] {
  const { dispatch } = store
  const diagnostics = [...inputs.diagnostics]
  const main = selectMain(inputs, 0)
  if (main === undefined) {
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return diagnostics
    return [
      ...diagnostics,
      {
        resourceIndex: 0,
        severity: "error",
        message: "No Auspice v2 JSON or Newick tree was provided.",
      },
    ]
  }
  const showMaps = canDrawMaps()
  // Before the dataset, so that its panels leave out a map that cannot be drawn (see `choosePanels`)
  dispatch(setViewerSettings({ mapsAvailable: showMaps }))
  if (!showMaps && hasGeoResolutions(main.json)) {
    diagnostics.push({
      resourceIndex: main.resourceIndex,
      severity: "warning",
      message:
        "This dataset has a map, but this VS Code window cannot draw it: the map needs WebGL, which is unavailable, e.g. with hardware acceleration disabled. The map panel is hidden.",
    })
  }
  // A narrative shows the panels its author chose for each slide
  const settings: ViewSettings = {
    showMaps,
    initialPanels: inputs.narrative === undefined ? initialPanels : "dataset",
  }
  const mainJson = applySettings(main.json, settings)
  const second = selectMain(inputs, 1)
  const secondJson = second === undefined ? false : applySettings(second.json, settings)
  const measurementsData = findSidecar(inputs, main, "measurements")?.json
  dispatch({
    type: "CLEAN_START",
    pathnameShouldBe: "",
    ...createStateFromQueryOrJSONs({
      json: mainJson,
      secondTreeDataset: secondJson,
      query: {},
      mainTreeName: main.datasetName,
      ...(measurementsData === undefined ? {} : { measurementsData }),
      ...(second === undefined ? {} : { secondTreeName: second.datasetName }),
      ...(inputs.narrative === undefined ? {} : { narrativeBlocks: inputs.narrative.blocks }),
      dispatch,
    }),
  })
  // Auspice derives the initial sidebar state from `window.innerWidth`, so in a
  // narrow webview it would start collapsed. The controls are the primary way to
  // drive the viewer, so open the sidebar by default; the fold tab still lets the
  // user collapse it.
  if (sidebarInitialState !== "dataset") {
    dispatch({ type: "TOGGLE_SIDEBAR", value: sidebarInitialState === "open" })
  }
  if (!isCurrent()) return diagnostics
  dispatch({ type: "CHANGE_LANGUAGE", data: locale })
  dispatch({ type: "PAGE_CHANGE", displayComponent: "main" })
  const datasets = Object.fromEntries(
    inputs.mains.map((input) => [input.datasetName, createDataset(input, inputs, settings)]),
  )
  datasets[main.datasetName]?.loadSidecars(store.dispatch)
  if (inputs.narrative !== undefined) dispatch({ type: "CACHE_JSONS", jsons: datasets })
  const tipCount = countTips(main.json["tree"])
  if (largeTreeTipAdvisory > 0 && tipCount > largeTreeTipAdvisory) {
    diagnostics.push({
      resourceIndex: main.resourceIndex,
      severity: "information",
      message: `This tree has ${tipCount.toLocaleString()} tips; interactive rendering may be slower.`,
    })
  }
  return diagnostics
}

function applySettings(
  json: Record<string, unknown>,
  settings: ViewSettings,
): Record<string, unknown> {
  return applyInitialPanels(applyMapSetting(json, settings.showMaps), settings.initialPanels)
}

interface ViewSettings {
  readonly showMaps: boolean
  readonly initialPanels: InitialPanels
}

function createDataset(
  main: MainInput,
  inputs: ParsedInputs,
  settings: ViewSettings,
): DatasetInstance {
  const dataset = new Dataset(main.datasetName)
  dataset.main = Promise.resolve(applySettings(main.json, settings))
  const tipFrequencies = inputs.sidecars.find(
    (sidecar) =>
      sidecar.datasetName === datasetName(main.datasetName) && sidecar.kind === "tipFrequencies",
  )?.json
  const rootSequence = inputs.sidecars.find(
    (sidecar) =>
      sidecar.datasetName === datasetName(main.datasetName) && sidecar.kind === "rootSequence",
  )?.json
  const measurements = findSidecar(inputs, main, "measurements")?.json
  if (tipFrequencies !== undefined) dataset.tipFrequencies = Promise.resolve(tipFrequencies)
  if (rootSequence !== undefined) dataset.rootSequence = Promise.resolve(rootSequence)
  if (measurements !== undefined) dataset.measurements = Promise.resolve(measurements)
  return dataset
}

function selectMain(inputs: ParsedInputs, index: number): MainInput | undefined {
  const narrativeName = inputs.narrative?.initialDatasetNames[index]
  return narrativeName === undefined
    ? inputs.mains[index]
    : inputs.mains.find((main) => main.datasetName === narrativeName)
}

function findSidecar(
  inputs: ParsedInputs,
  main: MainInput,
  kind: "measurements",
): ParsedInputs["sidecars"][number] | undefined {
  return inputs.sidecars.find(
    (sidecar) => sidecar.datasetName === datasetName(main.datasetName) && sidecar.kind === kind,
  )
}

function datasetName(name: string): string {
  return name.replaceAll("_", "/")
}

function hasGeoResolutions(json: Record<string, unknown>): boolean {
  const meta = json["meta"]
  return (
    isRecord(meta) && Array.isArray(meta["geo_resolutions"]) && meta["geo_resolutions"].length > 0
  )
}

function countTips(tree: unknown): number {
  if (!isRecord(tree)) return 0
  const pending: Record<string, unknown>[] = [tree]
  let count = 0
  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) continue
    const children = node["children"]
    const records = Array.isArray(children) ? children.filter(isRecord) : []
    if (records.length === 0) count += 1
    else pending.push(...records)
  }
  return count
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
