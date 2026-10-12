import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"

/**
 * Return a ref callback and the content box size of the element it is attached to. The size
 * excludes padding and scrollbars, and is undefined until the element is first measured.
 *
 * `ResizeObserver` reports a new size after layout and before paint. A state update from there
 * would render in a later task, so the browser would first paint a frame with the element at its
 * new size and the content sized from it at the old size (e.g. the tree in a panel area that the
 * sidebar has just widened). The update renders synchronously instead, in the same frame.
 */
export function useElementSize<T extends Element>(): ElementSize<T> {
  const [size, setSize] = useState<Size>()
  const observer = useRef<ResizeObserver | undefined>(undefined)

  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect()
    observer.current = undefined
    if (element === null) return
    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries.at(-1)?.contentRect
      if (rect === undefined) return
      flushSync(() => {
        setSize((previous) =>
          sameSize(previous, rect) ? previous : { width: rect.width, height: rect.height },
        )
      })
    })
    resizeObserver.observe(element)
    observer.current = resizeObserver
  }, [])

  return { ref, size }
}

export interface ElementSize<T extends Element> {
  readonly ref: (element: T | null) => void
  readonly size: Size | undefined
}

export interface Size {
  readonly width: number
  readonly height: number
}

function sameSize(previous: Size | undefined, next: Size): boolean {
  return previous !== undefined && previous.width === next.width && previous.height === next.height
}
