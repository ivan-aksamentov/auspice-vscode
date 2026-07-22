import { expect, mock, test } from "bun:test"

await mock.module("../../src/auspice-client/components", () => ({
  ViewerSplash: function ViewerSplash(): null {
    return null
  },
}))

test("test_extensions_registry_suppresses_navbar_container", async () => {
  const { default: registry } = await import("../../src/auspice-client/extensions-registry")

  // A null component is the patched Auspice contract for omitting the navbar's reserved row.
  expect(registry["navbarComponent"]).toBeNull()
  // Oracle: Auspice's datasetEditor.enableDatasetEditor() reads this extension key.
  expect(registry["enableDatasetEditor"]).toBe(true)
})
