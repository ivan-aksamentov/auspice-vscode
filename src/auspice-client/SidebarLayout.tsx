import React, { useLayoutEffect, useMemo, useRef, useState } from "react"

import { IconChevronLeft, IconChevronRight } from "./icons"

const SIDEBAR_ID = "auspice-vscode-sidebar"

/**
 * Layout of the viewer: the sidebar on the left of the panel area, toggled by a pull tab on its
 * edge. The tab stays on the edge in both states, so the toggle never moves away from the pointer
 * and the closed sidebar costs only the width of the tab. The sidebar always sits next to the
 * panels, never over them, so a change in the sidebar shows in the panels at once.
 *
 * Only the sidebar moves while it opens or closes, and only by `transform`, which the browser
 * animates without layout. The panel area changes width once, after the slide: re-drawing the
 * panels for a new width can take longer than the slide (e.g. a tree with thousands of tips), and
 * would stall the slide if it ran on every frame.
 */
export function SidebarLayout({
  open,
  width,
  label,
  theme,
  onToggle,
  sidebar,
  children,
}: SidebarLayoutProps): React.ReactElement {
  const railRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const reserved = useSpaceAfterSlide(railRef, open)

  useLayoutEffect(() => {
    const sidebarElement = sidebarRef.current
    if (sidebarElement === null) return
    // Keep the closed sidebar out of the keyboard order and the accessibility tree. React 16 has
    // no `inert` prop. Focus inside the closing sidebar moves to the tab, which stays visible.
    if (!open && sidebarElement.contains(document.activeElement)) {
      tabRef.current?.focus({ preventScroll: true })
    }
    sidebarElement.inert = !open
  }, [open])

  const tabLabel = open ? "Hide sidebar" : "Show sidebar"
  const style = useMemo<SidebarStyle>(
    () => ({
      "--auspice-vscode-sidebar-width": `${width}px`,
      "--auspice-vscode-sidebar-background": theme.background,
      "--auspice-vscode-sidebar-color": theme.color,
      "--auspice-vscode-sidebar-font": theme["font-family"],
      "--auspice-vscode-sidebar-shadow": theme.sidebarBoxShadow,
      "--auspice-vscode-sidebar-selected": theme.selectedColor,
      "--auspice-vscode-sidebar-unselected": theme.unselectedColor,
    }),
    [width, theme],
  )

  return (
    <div className="auspice-vscode-layout" style={style}>
      <div ref={railRef} className="auspice-vscode-rail" data-state={open ? "open" : "closed"}>
        <aside
          ref={sidebarRef}
          id={SIDEBAR_ID}
          className="auspice-vscode-sidebar"
          aria-label={label}
        >
          {sidebar}
        </aside>
        <button
          ref={tabRef}
          type="button"
          className="auspice-vscode-pull-tab"
          aria-controls={SIDEBAR_ID}
          aria-expanded={open}
          aria-label={tabLabel}
          title={tabLabel}
          onClick={onToggle}
        >
          {open ? <IconChevronLeft size={10} /> : <IconChevronRight size={10} />}
        </button>
      </div>
      <div
        className="auspice-vscode-panel-area"
        data-sidebar-space={reserved ? "reserved" : "free"}
      >
        {children}
      </div>
    </div>
  )
}

export interface SidebarLayoutProps {
  readonly open: boolean
  /** Width of the open sidebar */
  readonly width: number
  /** Name of the sidebar region for assistive technology */
  readonly label: string
  /** Colors and font of the sidebar, as Auspice's sidebar theme defines them */
  readonly theme: SidebarTheme
  readonly onToggle: () => void
  readonly sidebar: React.ReactNode
  readonly children: React.ReactNode
}

/** The entries of Auspice's sidebar theme (`components/main/styles.js`) that the layout uses */
export interface SidebarTheme {
  readonly background: string
  readonly color: string
  readonly "font-family": string
  readonly sidebarBoxShadow: string
  readonly selectedColor: string
  readonly unselectedColor: string
}

/**
 * Return whether the panel area leaves room for the sidebar: the open state, applied once the slide
 * of the rail has finished. A toggle during a slide replaces the running transition, whose
 * `finished` promise then rejects, and schedules its own update.
 */
function useSpaceAfterSlide(railRef: React.RefObject<HTMLElement | null>, open: boolean): boolean {
  const [reserved, setReserved] = useState(open)
  useLayoutEffect(() => {
    const animations = railRef.current?.getAnimations() ?? []
    let current = true
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (current) setReserved(open)
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) throw error
      })
    return () => {
      current = false
    }
  }, [railRef, open])
  return reserved
}

type SidebarStyle = React.CSSProperties & Record<`--auspice-vscode-sidebar-${string}`, string>
