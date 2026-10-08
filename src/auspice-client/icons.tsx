import React from "react"

// Inline stroke icons (16x16, currentColor) so the toolbar needs no icon font,
// no extra CSP font-src, and renders identically under Auspice's React 16.

export interface IconProps {
  readonly size?: number
}

export function IconReload({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size}>
      <path d="M13.5 3.5V6.5H10.5" />
      <path d="M13.1 6.5A5.5 5.5 0 1 0 13.9 9.5" />
    </Svg>
  )
}

export function IconProblems({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size}>
      <path d="M8 1.8 15 14H1L8 1.8Z" />
      <path d="M8 6.5V9.5" />
      <path d="M8 11.8V11.9" />
    </Svg>
  )
}

export function IconExternalLink({ size = 16 }: IconProps): React.ReactElement {
  return (
    <Svg size={size}>
      <path d="M7 3.5H3.5A1 1 0 0 0 2.5 4.5V12.5A1 1 0 0 0 3.5 13.5H11.5A1 1 0 0 0 12.5 12.5V9" />
      <path d="M9.5 2.5H13.5V6.5" />
      <path d="M13.5 2.5 7.5 8.5" />
    </Svg>
  )
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

function Svg({ size, children }: IconProps & { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
