// Queue only the latest size before the browser paints. Auspice redraws every
// SVG node when panel dimensions change, so repeated same-frame measurements
// must collapse into one update.
export function createPanelDimensionDispatcher(
  onDimensions: (dimensions: PanelDimensions) => void,
  schedule: FrameScheduler = scheduleAnimationFrame,
): PanelDimensionDispatcher {
  let committed: PanelDimensions | undefined
  let pending: PanelDimensions | undefined
  let cancelFrame: (() => void) | undefined

  function flush(): void {
    cancelFrame = undefined
    const dimensions = pending
    pending = undefined
    if (dimensions === undefined || dimensionsEqual(committed, dimensions)) return
    committed = dimensions
    onDimensions(dimensions)
  }

  function update(dimensions: PanelDimensions): void {
    pending = dimensions
    cancelFrame ??= schedule(flush)
  }

  function dispose(): void {
    cancelFrame?.()
    cancelFrame = undefined
    pending = undefined
  }

  return { update, dispose }
}

export interface PanelDimensions {
  readonly width: number
  readonly height: number
  readonly docHeight: number
}

export interface PanelDimensionDispatcher {
  update(dimensions: PanelDimensions): void
  dispose(): void
}

export type FrameScheduler = (callback: () => void) => () => void

function scheduleAnimationFrame(callback: () => void): () => void {
  const frame = requestAnimationFrame(callback)
  return function cancel(): void {
    cancelAnimationFrame(frame)
  }
}

function dimensionsEqual(left: PanelDimensions | undefined, right: PanelDimensions): boolean {
  return (
    left !== undefined &&
    left.width === right.width &&
    left.height === right.height &&
    left.docHeight === right.docHeight
  )
}
