import { expect, test } from "bun:test"

import { parseViewerResources } from "../../src/auspice-client/input"
import inputs from "../__fixtures__/gm_v1_conversion_inputs.json"
import outputs from "../__fixtures__/gm_v1_conversion_outputs.json"

const UTF8_ENCODER = new TextEncoder()

test("test_gm_input_v1_conversion_complete_pair", async () => {
  const input = inputs.complete_pair
  const actual = await parseViewerResources(
    [resource("legacy_meta.json", input.meta), resource("legacy_tree.json", input.tree)],
    1_000_000,
  )

  // Oracle: captured by test/__fixtures__/gm_v1_conversion_capture.ts#L1 from Auspice 2.73.0 convertFromV1().
  expect(actual.mains.at(0)?.json).toEqual(outputs.complete_pair)
})

function resource(name: string, content: Record<string, unknown>) {
  return {
    uri: `file:///fixtures/${name}`,
    name,
    bytes: UTF8_ENCODER.encode(JSON.stringify(content)),
  }
}
