import { describe, expect, test } from "bun:test"
import { gzipSync } from "node:zlib"

import { parseViewerResources } from "../../src/auspice-client/input"

const UTF8_ENCODER = new TextEncoder()

describe("viewer input classification", () => {
  test("test_input_classifies_auspicejson_as_main_dataset", async () => {
    const content = JSON.stringify({ version: "v2", meta: {}, tree: { name: "root" } })
    const input = resource("alpha.auspicejson", content)
    const actual = await parseViewerResources([input], 1_000_000)

    // Oracle: https://github.com/nextstrain/auspice.us/blob/41101592d37297f067c869e720fc956a47123e86/auspice_client_customisation/handleDroppedFiles.js
    expect(actual).toEqual({
      mains: [
        {
          datasetName: "alpha",
          json: { version: "v2", meta: {}, tree: { name: "root" } },
          resourceIndex: 0,
        },
      ],
      sidecars: [],
      diagnostics: [],
    })
  })

  test("test_input_classifies_newick_as_main_dataset", async () => {
    const actual = await parseViewerResources([resource("tree.nwk", "(A:1,B:1);")], 1_000_000)

    expect(actual.diagnostics).toEqual([])
    expect(actual.mains.map((input) => input.datasetName)).toEqual(["tree"])
    // Newick is converted to an Auspice v2 dataset (meta + tree) on the way in.
    const [main] = actual.mains
    expect(main !== undefined && Object.hasOwn(main.json, "tree")).toBe(true)
  })

  test("test_input_rejects_json_without_meta_and_tree", async () => {
    const actual = await parseViewerResources(
      [resource("node-data.json", JSON.stringify({ nodes: { A: { country: "CH" } } }))],
      1_000_000,
    )

    expect(actual.mains).toEqual([])
    expect(actual.diagnostics).toEqual([
      {
        resourceIndex: 0,
        severity: "error",
        message:
          "The JSON has no top-level meta and tree fields, so it is not an Auspice v2 dataset.",
      },
    ])
  })

  test("test_input_attaches_supported_sidecars_without_treating_them_as_trees", async () => {
    const actual = await parseViewerResources(
      [
        resource("alpha.json", JSON.stringify({ meta: {}, tree: { name: "root" } })),
        resource("alpha_tip-frequencies.json", JSON.stringify({ pivots: [2020] })),
        resource("alpha_measurements.json", JSON.stringify({ collections: [] })),
        resource("alpha_root-sequence.json", JSON.stringify({ nuc: "ACGT" })),
      ],
      1_000_000,
    )

    // Oracle: Auspice Dataset sidecars in src/actions/loadData.js and auspice.us handleDroppedFiles.js.
    expect(actual.sidecars).toEqual([
      {
        kind: "tipFrequencies",
        datasetName: "alpha",
        json: { pivots: [2020] },
        resourceIndex: 1,
      },
      {
        kind: "measurements",
        datasetName: "alpha",
        json: { collections: [] },
        resourceIndex: 2,
      },
      {
        kind: "rootSequence",
        datasetName: "alpha",
        json: { nuc: "ACGT" },
        resourceIndex: 3,
      },
    ])
    expect(actual.mains.map((input) => input.datasetName)).toEqual(["alpha"])
    expect(actual.diagnostics).toEqual([])
  })

  test("test_input_converts_a_complete_legacy_v1_pair", async () => {
    const meta = { title: "Legacy tree", updated: "2020-01-01", color_options: {} }
    const tree = { strain: "root", attr: { div: 0 }, children: [] }
    const actual = await parseViewerResources(
      [
        resource("legacy_meta.json", JSON.stringify(meta)),
        resource("legacy_tree.json", JSON.stringify(tree)),
      ],
      1_000_000,
    )

    // Oracle: Auspice 2.73 cli/server/convertJsonSchemas.js convertFromV1().
    const main = actual.mains.at(0)
    expect(main?.datasetName).toBe("legacy")
    expect(main?.json["version"]).toBe("v2")
    expect(main?.json["meta"]).toMatchObject({ title: "Legacy tree", updated: "2020-01-01" })
    expect(main?.json["tree"]).toMatchObject({ name: "root" })
    expect(actual.diagnostics).toEqual([])
  })

  test("test_input_reports_an_incomplete_legacy_v1_pair", async () => {
    const actual = await parseViewerResources(
      [resource("legacy_meta.json", JSON.stringify({ title: "Legacy tree" }))],
      1_000_000,
    )

    expect(actual.mains).toEqual([])
    expect(actual.diagnostics).toEqual([
      {
        resourceIndex: 0,
        severity: "error",
        message: "Legacy Auspice v1 data requires both legacy_meta.json and legacy_tree.json.",
      },
    ])
  })

  test("test_input_enforces_expanded_session_limit", async () => {
    const resources = [resource("tree.nwk", "(A:1,B:1);")]

    await expect(parseViewerResources(resources, 4)).rejects.toThrow("Expanded input data exceeds")
  })

  test("test_input_stops_gzip_decompression_at_expanded_session_limit", async () => {
    const expanded = "A".repeat(1_000_000)
    const resources = [binaryResource("tree.nwk.gz", gzipSync(expanded))]

    await expect(parseViewerResources(resources, 1_000)).rejects.toThrow(
      "Expanded input data exceeds",
    )
  })

  test("test_input_sniffs_auspice_v2_json_from_unknown_extension", async () => {
    // Detection reads content, not the extension: a valid v2 dataset behind a
    // foreign suffix still opens.
    const content = JSON.stringify({ version: "v2", meta: {}, tree: { name: "root" } })
    const actual = await parseViewerResources([resource("blabla.txt", content)], 1_000_000)

    expect(actual.diagnostics).toEqual([])
    expect(actual.mains).toEqual([
      {
        datasetName: "blabla.txt",
        json: { version: "v2", meta: {}, tree: { name: "root" } },
        resourceIndex: 0,
      },
    ])
  })

  test("test_input_sniffs_newick_from_unknown_extension", async () => {
    const actual = await parseViewerResources([resource("blabla.txt", "(A:1,B:1);")], 1_000_000)

    expect(actual.diagnostics).toEqual([])
    expect(actual.mains.map((input) => input.datasetName)).toEqual(["blabla.txt"])
    const [main] = actual.mains
    expect(main !== undefined && Object.hasOwn(main.json, "tree")).toBe(true)
  })

  test("test_input_reports_unrecognized_content", async () => {
    const actual = await parseViewerResources([resource("traits.xlsx", "untrusted")], 1_000)

    expect(actual).toEqual({
      mains: [],
      sidecars: [],
      diagnostics: [
        {
          resourceIndex: 0,
          severity: "error",
          message: "traits.xlsx could not be read as an Auspice v2 JSON dataset or a Newick tree.",
        },
      ],
    })
  })
})

function resource(
  name: string,
  content: string,
): {
  readonly uri: string
  readonly name: string
  readonly bytes: Uint8Array
} {
  return { uri: `file:///fixtures/${name}`, name, bytes: UTF8_ENCODER.encode(content) }
}

function binaryResource(
  name: string,
  bytes: Uint8Array,
): {
  readonly uri: string
  readonly name: string
  readonly bytes: Uint8Array
} {
  return { uri: `file:///fixtures/${name}`, name, bytes }
}
