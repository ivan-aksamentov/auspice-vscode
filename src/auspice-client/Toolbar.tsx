import React from "react"

import { IconExternalLink, IconProblems, IconReload } from "./icons"
import { postOpenInTaxonium, postReload, postShowDiagnostics } from "./messages"
import { useViewerStatus } from "./status"

export function Toolbar(): React.ReactElement {
  const status = useViewerStatus()
  return (
    <div className="auspice-vscode-toolbar" role="toolbar" aria-label="Auspice viewer actions">
      <span className="auspice-vscode-title">Auspice</span>
      <ToolbarButton label="Reload view" onClick={postReload}>
        <IconReload />
      </ToolbarButton>
      <ToolbarButton label="Show input problems" onClick={postShowDiagnostics}>
        <IconProblems />
      </ToolbarButton>
      <ToolbarButton label="Open current tree in Taxonium" onClick={postOpenInTaxonium}>
        <IconExternalLink />
      </ToolbarButton>
      {status.message ? (
        <output className={`auspice-vscode-status auspice-vscode-status-${status.kind}`}>
          {status.message}
        </output>
      ) : null}
    </div>
  )
}

interface ToolbarButtonProps {
  readonly label: string
  readonly onClick: () => void
  readonly children: React.ReactNode
}

function ToolbarButton({ label, onClick, children }: ToolbarButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className="auspice-vscode-button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
