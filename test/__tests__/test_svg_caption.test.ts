import { describe, expect, test } from "bun:test"

import { svgCaption } from "../../src/auspice-client/svgCaption"
import type { CaptionFigure } from "../../src/auspice-client/svgCaption"

// Oracle of the citation: `publications.nextstrain` in Auspice's components/download/downloadModal.js
const citation = {
  author: "Hadfield et al",
  title: "Nextstrain: real-time tracking of pathogen evolution",
  journal: "Bioinformatics",
  year: "2018",
  href: "https://doi.org/10.1093/bioinformatics/bty407",
}
const CITATION_LINK =
  '<a href="https://doi.org/10.1093/bioinformatics/bty407">Hadfield et al, Nextstrain: real-time tracking of pathogen evolution, Bioinformatics (2018)</a>'

const figure: CaptionFigure = {
  title: "Zika virus",
  treeName: "zika",
  updated: "2026-10-01",
  summary: "Showing 3 of 3 genomes.",
  mapAttribution: undefined,
  auspiceVersion: "3.1.0",
  citation,
}

describe("svg caption", () => {
  test("test_svg_caption_describes_a_dataset_and_cites_auspice", () => {
    const actual = svgCaption(figure)

    expect(actual).toEqual([
      "Zika virus",
      "Last updated 2026-10-01",
      "Showing 3 of 3 genomes.",
      "Made with Auspice 3.1.0 in VS Code",
      "",
      CITATION_LINK,
    ])
  })

  test("test_svg_caption_shows_html_characters_of_a_title_as_text", () => {
    const actual = svgCaption({ ...figure, title: "H3N2 <HA> & NA" })

    // Oracle: the caption lines are HTML (Auspice sets them as `innerHTML`), so `<`, `>` and `&`
    // are written as character references
    expect(actual[0]).toBe("H3N2 &lt;HA&gt; &amp; NA")
  })

  test("test_svg_caption_leaves_out_the_update_date_of_a_dataset_without_one", () => {
    const actual = svgCaption({ ...figure, updated: undefined })

    // Oracle: a Newick tree has no `meta.updated`; Auspice wrote "Last updated undefined"
    expect(actual).toEqual([
      "Zika virus",
      "Showing 3 of 3 genomes.",
      "Made with Auspice 3.1.0 in VS Code",
      "",
      CITATION_LINK,
    ])
  })

  test("test_svg_caption_names_the_tree_of_a_dataset_without_a_title", () => {
    const actual = svgCaption({ ...figure, title: undefined, treeName: "flu/h3n2" })

    expect(actual[0]).toBe("flu/h3n2")
  })

  test("test_svg_caption_attributes_the_map_of_a_figure_with_a_map", () => {
    const attribution = '<a href="https://www.naturalearthdata.com/">Natural Earth</a> 5.1.2'
    const actual = svgCaption({ ...figure, mapAttribution: attribution })

    // Oracle: the attribution is the HTML of the map style and stays a link
    expect(actual).toEqual([
      "Zika virus",
      "Last updated 2026-10-01",
      "Showing 3 of 3 genomes.",
      `Map: ${attribution}`,
      "Made with Auspice 3.1.0 in VS Code",
      "",
      CITATION_LINK,
    ])
  })
})
