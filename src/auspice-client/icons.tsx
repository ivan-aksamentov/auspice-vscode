import React from "react"

// Inline stroke icons (16x16, currentColor) so the viewer needs no icon font,
// no extra CSP font-src, and renders identically under Auspice's React 16.

export interface IconProps {
  readonly size?: number
}

export function IconDownload({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size}>
      <path d="M8 2.5V10" />
      <path d="M4.5 6.5 8 10 11.5 6.5" />
      <path d="M2.5 10.5V12.5A1 1 0 0 0 3.5 13.5H12.5A1 1 0 0 0 13.5 12.5V10.5" />
    </Svg>
  )
}

export function IconChevronLeft({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size} strokeWidth={2}>
      <path d="M10.5 2.5 5 8 10.5 13.5" />
    </Svg>
  )
}

export function IconChevronRight({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size} strokeWidth={2}>
      <path d="M5.5 2.5 11 8 5.5 13.5" />
    </Svg>
  )
}

function Svg({
  size,
  strokeWidth = 1.3,
  children,
}: IconProps & {
  readonly strokeWidth?: number
  readonly children: React.ReactNode
}): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
