import React, { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useStore } from "react-redux"
import { z } from "zod"

import { IconDownload } from "./icons"

// Downloads of the current view: the figure (SVG), the dataset with the view as its display
// defaults (Auspice JSON), and the tree (Newick). Auspice renders them before the zoom buttons of
// the main tree (`treeButtonsComponent`) and passes the tab style of those buttons. Auspice reads
// the extension registry, which holds this component, while its own modules load, so the Auspice
// download modules are imported when a button is pressed instead of when this module loads.

const viewStateSchema = z.object({
  metadata: z.looseObject({}),
  tree: z.looseObject({ nodes: z.unknown(), visibility: z.unknown() }),
  controls: z.looseObject({
    colorBy: z.string(),
    distanceMeasure: z.string(),
    panelsToDisplay: z.array(z.string()),
    panelLayout: z.string(),
  }),
})

export function TreeDownloadButtons({ buttonStyle }: TreeDownloadButtonsProps): React.ReactElement {
  const store = useStore<unknown>()
  const { t } = useTranslation()

  const downloadSvg = useCallback(async () => {
    const [{ SVG: writeSvg }, { getFilePrefix }, { relevantPublications }] = await Promise.all([
      import("@auspice/components/download/helperFunctions"),
      import("@auspice/components/download/downloadButtons"),
      import("@auspice/components/download/downloadModal"),
    ])
    const { metadata, tree, controls } = viewStateSchema.parse(store.getState())
    writeSvg(
      store.dispatch,
      t,
      metadata,
      tree.nodes,
      tree.visibility,
      getFilePrefix(),
      controls.panelsToDisplay,
      controls.panelLayout,
      relevantPublications(controls.colorBy),
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

interface DownloadButtonProps {
  readonly label: string
  readonly tooltip: string
  readonly style: React.CSSProperties
  readonly download: () => Promise<void>
}
