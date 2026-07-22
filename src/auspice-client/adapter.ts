import { Dataset } from "@auspice/actions/loadData"
import type { DatasetInstance } from "@auspice/actions/loadData"
import { createStateFromQueryOrJSONs } from "@auspice/actions/recomputeReduxState"
import store from "@auspice/store"

import type { MainInput, ParsedInputs, ViewerDiagnostic } from "./input"
import { applyMapSetting } from "./mapSetting"

export function loadIntoAuspice(
  inputs: ParsedInputs,
  largeTreeTipAdvisory: number,
  mapsEnabled: boolean,
  sidebarInitialState: "open" | "closed" | "dataset",
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
  const mainJson = applyMapSetting(main.json, mapsEnabled)
  const second = selectMain(inputs, 1)
  const secondJson = second === undefined ? false : applyMapSetting(second.json, mapsEnabled)
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
    inputs.mains.map((input) => [input.datasetName, createDataset(input, inputs, mapsEnabled)]),
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

function createDataset(
  main: MainInput,
  inputs: ParsedInputs,
  mapsEnabled: boolean,
): DatasetInstance {
  const dataset = new Dataset(main.datasetName)
  dataset.main = Promise.resolve(applyMapSetting(main.json, mapsEnabled))
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
