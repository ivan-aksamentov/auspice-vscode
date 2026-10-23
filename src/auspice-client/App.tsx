import { BROWSER_DIMENSIONS, TOGGLE_MOBILE_DISPLAY } from "@auspice/actions/types"
import React, { Suspense, useEffect, useRef } from "react"
import { Provider, useSelector } from "react-redux"

import { ViewerSplash } from "./components"
import { createPanelDimensionDispatcher } from "./dimensions"
import { ErrorBoundary } from "./ErrorBoundary"
import { store } from "./store"
import { Toolbar } from "./Toolbar"
import { ViewerMain } from "./ViewerMain"

// The shell owns the chrome and the layout (`ViewerMain`). Auspice components
// such as the info header and the modal size themselves from
// `state.browserDimensions`, which Auspice's `<Monitor>` fills from `window`.
// Coupling to the window makes the view look zoomed and animate in from a tiny
// size when the webview tab is shown again. Instead, a ResizeObserver on the
// viewer container feeds the real available size (below the toolbar) into the
// store, so the components are correct on first paint.
export function App(): React.ReactElement {
  const panelsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = panelsRef.current
    if (container === null) return undefined
    const dimensions = createPanelDimensionDispatcher((data) => {
      store.dispatch({ type: BROWSER_DIMENSIONS, data })
    })
    const observer = new ResizeObserver((entries) => {
      const rect = entries.at(0)?.contentRect
      if (rect === undefined) return
      dimensions.update({ width: rect.width, height: rect.height, docHeight: rect.height })
    })
    observer.observe(container)
    return () => {
      observer.disconnect()
      dimensions.dispose()
    }
  }, [])
  // Auspice components switch to a "mobile" variant whenever `window.innerWidth`
  // is below its breakpoint. A webview pane is routinely narrower than that, so
  // the viewer would render mobile controls on a full-size desktop. The shell
  // always docks the sidebar, so pin the store to desktop mode. Auspice's
  // `<Monitor>` (which would flip this back on window resize) is not mounted
  // here, so a single dispatch holds.
  useEffect(() => {
    store.dispatch({ type: TOGGLE_MOBILE_DISPLAY, value: false })
  }, [])
  return (
    <Provider store={store}>
      <div className="auspice-vscode-shell">
        <Toolbar />
        <div className="auspice-vscode-panels" ref={panelsRef}>
          <DisplaySwitch />
        </div>
      </div>
    </Provider>
  )
}

function DisplaySwitch(): React.ReactElement {
  const displayComponent = useSelector((state: AuspiceRootState) => state.general?.displayComponent)
  if (displayComponent === "splash") return <ViewerSplash />
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <ViewerMain />
      </Suspense>
    </ErrorBoundary>
  )
}

interface AuspiceRootState {
  readonly general?: { readonly displayComponent?: string }
}
