import { getFilePrefix } from "@auspice/components/download/downloadButtons"
import { publications } from "@auspice/components/download/downloadModal"
import {
  SVG as writeSvg,
  acknowledgmentsTSV,
  areAuthorsPresent,
  auspiceJSON,
  authorTSV,
  entropyTSV,
  exportTree,
  strainTSV,
} from "@auspice/components/download/helperFunctions"
import { datasetSummary } from "@auspice/components/info/datasetSummary"
import { darkGrey, tabSingle } from "@auspice/globalStyles"
import { calcEntropyInView } from "@auspice/util/entropy"
import { getMapTilesSettings } from "@auspice/util/globals"
import { version } from "@auspice/version"
import React, { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSelector, useStore } from "react-redux"
import { z } from "zod"

import { IconDownload } from "./icons"
import { svgCaption } from "./svgCaption"

// Downloads of the current view: the figure (SVG), the dataset with the view as its display
// defaults (Auspice JSON), the tree (Newick), the metadata, the authors and the acknowledgments of
// the shown tips (TSV), and the genetic diversity data (TSV). They replace Auspice's download
// modal, whose texts describe nextstrain.org data. As in the modal, each download shows where the
// dataset's sharing settings allow it: GISAID data, for example, gets its acknowledgments instead
// of the dataset and the metadata.

/** The look of Auspice's zoom buttons, which the download buttons stand next to */
const BUTTON_STYLE: React.CSSProperties = {
  ...tabSingle,
  color: darkGrey,
  cursor: "pointer",
  display: "inline-block",
  marginLeft: "4px",
}

const viewStateSchema = z.object({
  metadata: z.looseObject({
    title: z.string().optional(),
    updated: z.string().optional(),
    mainTreeNumTips: z.number(),
  }),
  tree: z.looseObject({ name: z.string(), nodes: z.unknown(), visibility: z.unknown() }),
  controls: z.looseObject({
    branchLengthsToDisplay: z.string(),
    distanceMeasure: z.string(),
    panelsToDisplay: z.array(z.string()),
    panelLayout: z.string(),
  }),
})
const entropyStateSchema = z.object({
  entropy: z.looseObject({
    bars: z.unknown(),
    selectedCds: z.unknown(),
    showCounts: z.boolean(),
  }),
  tree: z.looseObject({ nodes: z.unknown(), visibility: z.unknown() }),
})

export function TreeDownloadButtons(): React.ReactElement {
  const store = useStore<unknown>()
  const { t } = useTranslation()
  const sharing = useSelector((state: DownloadState) => state.metadata.sharing)
  // Auspice parses a dataset without genome annotations to an empty genome map, so the diversity
  // data exists only where the entropy panel does
  const entropyAvailable = useSelector((state: DownloadState) =>
    state.controls.panelsAvailable.includes("entropy"),
  )
  const nodes = useSelector((state: DownloadState) => state.tree.nodes)
  const authorsPresent = useMemo(() => areAuthorsPresent({ nodes }), [nodes])

  const downloadSvg = useCallback(async () => {
    const { metadata, tree, controls } = viewStateSchema.parse(store.getState())
    const caption = svgCaption({
      title: presentText(metadata.title),
      treeName: tree.name,
      updated: presentText(metadata.updated),
      summary: datasetSummary({
        nodes: tree.nodes,
        visibility: tree.visibility,
        mainTreeNumTips: metadata.mainTreeNumTips,
        branchLengthsToDisplay: controls.branchLengthsToDisplay,
        t,
      }),
      mapAttribution: controls.panelsToDisplay.includes("map")
        ? getMapTilesSettings().attribution
        : undefined,
      auspiceVersion: version,
      citation: publications.nextstrain,
    })
    await writeSvg(
      store.dispatch,
      t,
      metadata,
      tree.nodes,
      tree.visibility,
      getFilePrefix(),
      controls.panelsToDisplay,
      controls.panelLayout,
      [],
      caption,
    )
  }, [store, t])

  const downloadJson = useCallback(() => {
    auspiceJSON(store.dispatch, store.getState(), getFilePrefix())
  }, [store])

  const downloadNewick = useCallback(() => {
    const { tree, controls } = viewStateSchema.parse(store.getState())
    exportTree({
      isNewick: true,
      dispatch: store.dispatch,
      filePrefix: getFilePrefix(),
      tree,
      temporal: controls.distanceMeasure === "num_date",
    })
  }, [store])

  const downloadMetadata = useCallback(() => {
    const { tree } = viewStateSchema.parse(store.getState())
    strainTSV(store.dispatch, getFilePrefix(), tree.nodes, tree.visibility)
  }, [store])

  const downloadAuthors = useCallback(() => {
    const { tree } = viewStateSchema.parse(store.getState())
    authorTSV(store.dispatch, getFilePrefix(), tree)
  }, [store])

  const downloadAcknowledgments = useCallback(() => {
    const { tree } = viewStateSchema.parse(store.getState())
    acknowledgmentsTSV(store.dispatch, getFilePrefix(), tree.nodes, tree.visibility)
  }, [store])

  const downloadEntropy = useCallback(() => {
    const { entropy, tree } = entropyStateSchema.parse(store.getState())
    // Auspice computes the bars only while the entropy panel is on screen, as the SVG export does
    const bars =
      entropy.bars ??
      calcEntropyInView(tree.nodes, tree.visibility, entropy.selectedCds, entropy.showCounts)[0]
    entropyTSV(store.dispatch, getFilePrefix(), { ...entropy, bars })
  }, [store])

  return (
    <>
      {sharing.screenshot ? (
        <DownloadButton
          label="SVG"
          tooltip="Download the figure of the current view (SVG)"
          download={downloadSvg}
        />
      ) : null}
      {sharing.dataset_json ? (
        <DownloadButton
          label="JSON"
          tooltip="Download the dataset with the current view as its display defaults (Auspice JSON)"
          download={downloadJson}
        />
      ) : null}
      {sharing.trees ? (
        <DownloadButton
          label="NWK"
          tooltip="Download the tree of the current view, with branch lengths in years for a time tree (Newick)"
          download={downloadNewick}
        />
      ) : null}
      {sharing.metadata_tsv ? (
        <DownloadButton
          label="TSV"
          tooltip="Download the metadata of the shown tips (TSV)"
          download={downloadMetadata}
        />
      ) : null}
      {sharing.authors && authorsPresent ? (
        <DownloadButton
          label="Authors TSV"
          tooltip="Download the authors of the shown tips, with their publications (TSV)"
          download={downloadAuthors}
        />
      ) : null}
      {sharing.gisaid_acknowledgments === true ? (
        <DownloadButton
          label="Acknowledgments TSV"
          tooltip="Download the GISAID accessions, laboratories and authors of the shown tips (TSV)"
          download={downloadAcknowledgments}
        />
      ) : null}
      {sharing.entropy && entropyAvailable ? (
        <DownloadButton
          label="Entropy TSV"
          tooltip="Download the genetic diversity data of the shown tips (TSV)"
          download={downloadEntropy}
        />
      ) : null}
    </>
  )
}

function DownloadButton({ label, tooltip, download }: DownloadButtonProps): React.ReactElement {
  const onClick = useCallback(() => {
    Promise.resolve()
      .then(download)
      .catch((error: unknown) => {
        console.error(`[auspice-vscode] ${label} download failed`, error)
      })
  }, [download, label])
  return (
    <button
      type="button"
      className="auspice-vscode-tree-download"
      style={BUTTON_STYLE}
      title={tooltip}
      onClick={onClick}
    >
      <IconDownload size={11} />
      {label}
    </button>
  )
}

/** Return the text of a metadata field, which Auspice sets to "" when the dataset has none */
function presentText(text: string | undefined): string | undefined {
  return text === "" ? undefined : text
}

/** The parts of Auspice's state that the buttons read */
interface DownloadState {
  readonly metadata: {
    /** Which downloads the dataset allows (`meta.sharing`, and Auspice's GISAID rules) */
    readonly sharing: {
      readonly dataset_json: boolean
      readonly metadata_tsv: boolean
      readonly authors: boolean
      /** Set for GISAID data only */
      readonly gisaid_acknowledgments?: boolean
      readonly trees: boolean
      readonly entropy: boolean
      readonly screenshot: boolean
    }
  }
  readonly controls: { readonly panelsAvailable: readonly string[] }
  readonly tree: { readonly nodes: unknown }
}

interface DownloadButtonProps {
  readonly label: string
  readonly tooltip: string
  /** Write the file; a failure, thrown or as a rejected promise, shows in the console */
  readonly download: () => Promise<void> | void
}
