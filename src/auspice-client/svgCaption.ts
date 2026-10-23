import escape from "lodash/escape"

/**
 * Return the text lines (HTML) below the figure of an SVG export. Auspice writes lines for
 * nextstrain.org datasets: the page address, a data use statement and a license. A local dataset
 * has neither, so the caption names the dataset, the view, the map data and the viewer.
 */
export function svgCaption(figure: CaptionFigure): string[] {
  const { author, title, journal, year, href } = figure.citation
  return [
    escape(figure.title ?? figure.treeName),
    ...(figure.updated === undefined ? [] : [`Last updated ${escape(figure.updated)}`]),
    escape(figure.summary),
    // The attribution is the HTML of the map style, which links its data source
    ...(figure.mapAttribution === undefined ? [] : [`Map: ${figure.mapAttribution}`]),
    `Made with Auspice ${escape(figure.auspiceVersion)} in VS Code`,
    "",
    `<a href="${escape(href)}">${escape(`${author}, ${title}, ${journal} (${year})`)}</a>`,
  ]
}

/** What the caption describes */
export interface CaptionFigure {
  /** Title of the dataset (`meta.title`) */
  readonly title: string | undefined
  /** Name of the tree, which the viewer derives from its file name */
  readonly treeName: string
  /** Update date of the dataset (`meta.updated`), which Newick trees do not have */
  readonly updated: string | undefined
  /** The sentence of Auspice's dataset summary, e.g. "Showing 3 of 3 genomes." */
  readonly summary: string
  /** Attribution (HTML) of the map data, when the figure holds the map */
  readonly mapAttribution: string | undefined
  readonly auspiceVersion: string
  /** The publication to cite for Auspice */
  readonly citation: Publication
}

/** A publication, as Auspice's download modal lists them */
export interface Publication {
  readonly author: string
  readonly title: string
  readonly journal: string
  readonly year: string
  readonly href: string
}
