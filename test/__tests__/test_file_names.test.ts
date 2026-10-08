import { describe, expect, test } from "bun:test"

import { datasetStem, exportFileName, exportFilters } from "../../src/fileNames"

describe("dataset and export file names", () => {
  test.each([
    ["flu.auspice.json", "flu"],
    ["flu.auspicejson", "flu"],
    ["flu.auspice.json.gz", "flu"],
    ["Flu.JSON", "Flu"],
    ["tree.nwk", "tree"],
    ["tree.newick.gzip", "tree"],
    ["zika_meta.json", "zika"],
    ["zika_tree.json", "zika"],
    ["notes.txt", "notes.txt"],
  ])("test_dataset_stem_of_%s", (fileName, expected) => {
    expect(datasetStem(fileName)).toBe(expected)
  })

  test("test_export_file_name_prefixes_the_dataset_stem", () => {
    expect(exportFileName("HCoV_229E_whole-genome.json", "view_timetree.nwk")).toBe(
      "HCoV_229E_whole-genome_view_timetree.nwk",
    )
  })

  test.each([
    ["flu_view.svg", { "SVG image": ["svg"] }],
    ["flu_view.json", { JSON: ["json"] }],
    ["flu_view_tree.nwk", { "Newick tree": ["nwk", "newick"] }],
    ["flu_view_tree.nexus", { "Nexus tree": ["nexus", "nex"] }],
    ["flu_view_metadata.TSV", { "TSV table": ["tsv"] }],
    ["flu_view", { "All files": ["*"] }],
  ])("test_export_filters_of_%s", (fileName, expected) => {
    expect(exportFilters(fileName)).toEqual(expected)
  })
})
