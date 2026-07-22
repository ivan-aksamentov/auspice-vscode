import React from "react"

import logoUrl from "../../assets/img/logo-256.png"
import { useViewerStatus } from "./status"

// Fills Auspice's "splash" display slot, which stays mounted from the first
// paint until the dataset finishes building (`PAGE_CHANGE` to "main"). There is
// no landing page: a view always has exactly one dataset, so the slot only ever
// shows the load spinner or, if the load fails, the error. The toolbar carries
// the accompanying status text.
export function ViewerSplash(): React.ReactElement {
  const status = useViewerStatus()
  if (status.kind === "error") {
    const reasons =
      status.messages !== undefined && status.messages.length > 0
        ? status.messages
        : [status.message || "The dataset could not be loaded."]
    return (
      <main className="auspice-vscode-error" role="alert">
        <h2 className="auspice-vscode-error-title">The dataset could not be loaded</h2>
        <ul className="auspice-vscode-error-cards">
          {reasons.map((reason, index) => (
            // Static, non-reordered list; messages can repeat, so the index
            // keeps keys unique where the text alone would collide.
            // oxlint-disable-next-line react/no-array-index-key
            <li key={`${index}-${reason}`} className="auspice-vscode-error-card">
              {reason}
            </li>
          ))}
        </ul>
      </main>
    )
  }
  // Mirrors the pre-bundle placeholder in `renderWebviewHtml` so the first paint
  // and this splash show the same pulsing logo with no style jump when React
  // takes over. The `.auspice-loading` styles live in the shell's <head>, which
  // survives React mounting, so they apply here too.
  return (
    <output className="auspice-loading">
      <img className="auspice-loading__logo" src={logoUrl} alt="Loading" width={96} height={96} />
    </output>
  )
}
