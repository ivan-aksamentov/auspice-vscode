import { expect, test } from "bun:test"

test("test_extensions_registry_enables_dataset_editor", async () => {
  const { default: registry } = await import("../../src/auspice-client/extensions-registry")

  // Oracle: Auspice's datasetEditor.enableDatasetEditor() reads this extension key.
  expect(registry["enableDatasetEditor"]).toBe(true)
})
