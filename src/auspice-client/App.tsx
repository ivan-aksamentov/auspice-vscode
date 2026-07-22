import { BROWSER_DIMENSIONS, TOGGLE_MOBILE_DISPLAY } from "@auspice/actions/types"
import Main from "@auspice/components/main"
import store from "@auspice/store"
import React, { Suspense, useEffect, useRef } from "react"
import { Provider, useSelector } from "react-redux"

import { ViewerSplash } from "./components"
import { ErrorBoundary } from "./ErrorBoundary"
import { Toolbar } from "./Toolbar"

// The shell owns the chrome and the sizing. Auspice's own layout (`<Main>`)
// derives every panel dimension from `state.browserDimensions`, which its
// `<Monitor>` fills from `window`. Coupling to the window makes the view look
// zoomed and animate in from a tiny size when the webview tab is shown again.
// Instead, a ResizeObserver on the panel container feeds the real available
// size (below the toolbar) into the store, so panels are correct on first paint.
export function App(): React.ReactElement {
  const panelsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = panelsRef.current
    if (container === null) return undefined
    const observer = new ResizeObserver((entries) => {
      const rect = entries.at(0)?.contentRect
      if (rect === undefined) return
      const data = { width: rect.width, height: rect.height, docHeight: rect.height }
      store.dispatch({ type: BROWSER_DIMENSIONS, data })
    })
    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [])
  // Auspice picks "mobile" chrome (a floating toggle button and a dimming
  // overlay instead of an inline sidebar) whenever `window.innerWidth` is below
  // its breakpoint. A webview pane is routinely narrower than that, so the
  // viewer would open in mobile mode on a full-size desktop. The shell owns its
  // own chrome and always docks the sidebar, so pin the store to desktop mode.
  // Auspice's `<Monitor>` (which would flip this back on window resize) is not
  // mounted here, so a single dispatch holds.
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
        <Main />
      </Suspense>
    </ErrorBoundary>
  )
}

interface AuspiceRootState {
  readonly general?: { readonly displayComponent?: string }
}
