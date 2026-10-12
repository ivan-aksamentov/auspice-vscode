// styled-components 4, which Auspice styles its components with, ships no type declarations.
// The shell only provides Auspice's sidebar theme to those components.
declare module "styled-components" {
  import type { ComponentType, ReactNode } from "react"

  export const ThemeProvider: ComponentType<{
    readonly theme: Readonly<Record<string, string>>
    readonly children?: ReactNode
  }>
}
