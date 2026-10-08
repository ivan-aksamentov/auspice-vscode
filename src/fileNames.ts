// File names of the dataset inputs and of the files that the viewer exports. The input classifier in
// the viewer and the save dialog in the host share these, so both recognize the same datasets.

export const JSON_SUFFIXES = [".auspice.json", ".auspicejson", ".json"]
export const NEWICK_SUFFIXES = [".new", ".nwk", ".newick"]
export const V1_META_SUFFIX = "_meta.json"
export const V1_TREE_SUFFIX = "_tree.json"

const COMPRESSED_SUFFIX = /\.(?:gz|gzip)$/iu
const DATASET_SUFFIXES = [V1_META_SUFFIX, V1_TREE_SUFFIX, ...JSON_SUFFIXES, ...NEWICK_SUFFIXES]

// Save dialog filters of the files that Auspice downloads, by file extension
const EXPORT_FILTERS: Readonly<Record<string, Record<string, string[]>>> = {
  csv: { "CSV table": ["csv"] },
  json: { JSON: ["json"] },
  nexus: { "Nexus tree": ["nexus", "nex"] },
  nwk: { "Newick tree": ["nwk", "newick"] },
  svg: { "SVG image": ["svg"] },
  tsv: { "TSV table": ["tsv"] },
}

/** Return the dataset file name without its compression and format suffixes */
export function datasetStem(fileName: string): string {
  return stripSuffix(fileName.replace(COMPRESSED_SUFFIX, ""), DATASET_SUFFIXES)
}

/** Return the default name of a file that the viewer exports from a dataset, e.g. `flu_view.svg` */
export function exportFileName(datasetFileName: string, exportName: string): string {
  return `${datasetStem(datasetFileName)}_${exportName}`
}

/** Return the save dialog filters for an exported file */
export function exportFilters(fileName: string): Record<string, string[]> {
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
  return EXPORT_FILTERS[extension] ?? { "All files": ["*"] }
}

export function stripSuffix(name: string, suffixes: readonly string[]): string {
  const lower = name.toLowerCase()
  const suffix = suffixes.find((candidate) => lower.endsWith(candidate))
  return suffix === undefined ? name : name.slice(0, -suffix.length)
}
