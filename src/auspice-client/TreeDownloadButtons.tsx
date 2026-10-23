import React, { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSelector, useStore } from "react-redux"
import { z } from "zod"

import { IconDownload } from "./icons"
import { svgCaption } from "./svgCaption"

// Downloads of the current view: the figure (SVG), the dataset with the view as its display
// defaults (Auspice JSON), the tree (Newick), the metadata of the shown tips (TSV), and the
// genetic diversity data (TSV). They replace Auspice's download modal, whose texts describe
// nextstrain.org data. Auspice reads the extension registry, which holds this component, while its
// own modules load, so the Auspice download modules are imported when a button is pressed instead
// of when this module loads.

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

export function TreeDownloadButtons({ buttonStyle }: TreeDownloadButtonsProps): React.ReactElement {
  const store = useStore<unknown>()
  const { t } = useTranslation()
  const entropyLoaded = useSelector((state: DownloadState) => state.entropy.loaded)

  const downloadSvg = useCallback(async () => {
    const [
      { SVG: writeSvg },
      { getFilePrefix },
      { publications },
      { datasetSummary },
      { getMapTilesSettings },
      { version },
    ] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
      import("@auspice/components/download/downloadModal"),
      import("@auspice/components/info/datasetSummary"),
      import("@auspice/util/globals"),
      import("@auspice/version"),
    ])
    const { metadata, tree, controls } = viewStateSchema.parse(store.getState())
    const caption = svgCaption({
      title: metadata.title,
      treeName: tree.name,
      updated: metadata.updated,
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

  const downloadJson = useCallback(async () => {
    const [{ auspiceJSON }, { getFilePrefix }] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
    ])
    auspiceJSON(store.dispatch, store.getState(), getFilePrefix())
  }, [store])

  const downloadNewick = useCallback(async () => {
    const [{ exportTree }, { getFilePrefix }] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
    ])
    const { tree, controls } = viewStateSchema.parse(store.getState())
    exportTree({
      isNewick: true,
      dispatch: store.dispatch,
      filePrefix: getFilePrefix(),
      tree,
      temporal: controls.distanceMeasure === "num_date",
    })
  }, [store])

  const downloadMetadata = useCallback(async () => {
    const [{ strainTSV }, { getFilePrefix }] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
    ])
    const { tree } = viewStateSchema.parse(store.getState())
    strainTSV(store.dispatch, getFilePrefix(), tree.nodes, tree.visibility)
  }, [store])

  const downloadEntropy = useCallback(async () => {
    const [{ entropyTSV }, { getFilePrefix }, { calcEntropyInView }] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
      import("@auspice/util/entropy"),
    ])
    const { entropy, tree } = entropyStateSchema.parse(store.getState())
    // Auspice computes the bars only while the entropy panel is on screen, as the SVG export does
    const bars =
      entropy.bars ??
      calcEntropyInView(tree.nodes, tree.visibility, entropy.selectedCds, entropy.showCounts)[0]
    entropyTSV(store.dispatch, getFilePrefix(), { ...entropy, bars })
  }, [store])

  return (
    <>
      <DownloadButton
        label="SVG"
        tooltip="Download the figure of the current view (SVG)"
        style={buttonStyle}
        download={downloadSvg}
      />
      <DownloadButton
        label="JSON"
        tooltip="Download the dataset with the current view as its display defaults (Auspice JSON)"
        style={buttonStyle}
        download={downloadJson}
      />
      <DownloadButton
        label="NWK"
        tooltip="Download the tree of the current view, with branch lengths in years for a time tree (Newick)"
        style={buttonStyle}
        download={downloadNewick}
      />
      <DownloadButton
        label="TSV"
        tooltip="Download the metadata of the shown tips (TSV)"
        style={buttonStyle}
        download={downloadMetadata}
      />
      {entropyLoaded ? (
        <DownloadButton
          label="Entropy TSV"
          tooltip="Download the genetic diversity data of the shown tips (TSV)"
          style={buttonStyle}
          download={downloadEntropy}
        />
      ) : null}
    </>
  )
}

export interface TreeDownloadButtonsProps {
  readonly buttonStyle: React.CSSProperties
}

function DownloadButton({
  label,
  tooltip,
  style,
  download,
}: DownloadButtonProps): React.ReactElement {
  const onClick = useCallback(() => {
    download().catch((error: unknown) => {
      console.error(`[auspice-vscode] ${label} download failed`, error)
    })
  }, [download, label])
  return (
    <button
      type="button"
      className="auspice-vscode-tree-download"
      style={style}
      title={tooltip}
      onClick={onClick}
    >
      <IconDownload size={11} />
      {label}
    </button>
  )
}

/** The part of Auspice's state that the buttons read */
interface DownloadState {
  readonly entropy: { readonly loaded: boolean }
}

interface DownloadButtonProps {
  readonly label: string
  readonly tooltip: string
  readonly style: React.CSSProperties
  readonly download: () => Promise<void>
}
