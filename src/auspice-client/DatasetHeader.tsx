import { enableDatasetEditor } from "@auspice/components/datasetEditor/datasetEditor"
import EditButton from "@auspice/components/datasetEditor/editButton"
import EditedBanner from "@auspice/components/datasetEditor/editedBanner"
import Byline from "@auspice/components/info/byline"
import Warning from "@auspice/components/info/warning"
import React from "react"
import { useSelector } from "react-redux"

/**
 * The header above the panels: the parts of Auspice's info card without the summary, which the tree
 * card title row shows next to the tree (see `TreePanel`). The title, the dataset editor's edit
 * button and banner, the maintainers and sources (byline), and the dataset's warning.
 */
export function DatasetHeader(): React.ReactElement {
  const title = useSelector((state: HeaderState) => state.metadata.title)
  const edited = useSelector((state: HeaderState) => state.metadata.edited === true)
  const editable = enableDatasetEditor()
  return (
    <header className="auspice-vscode-dataset-header">
      {editable && edited ? <EditedBanner /> : null}
      {/* The edit button floats right of the title, sized by the font of this row */}
      <div className="auspice-vscode-dataset-title-row">
        {editable ? <EditButton /> : null}
        {title === undefined || title === "" ? null : (
          <h1 className="auspice-vscode-dataset-title">{title}</h1>
        )}
      </div>
      <div className="auspice-vscode-dataset-byline">
        <Byline />
      </div>
      <Warning />
    </header>
  )
}

/** The parts of Auspice's state that the header reads */
interface HeaderState {
  readonly metadata: { readonly title?: string; readonly edited?: boolean }
}
