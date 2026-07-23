import { describe, expect, test } from "bun:test"

import type { FrameScheduler, PanelDimensions } from "../../src/auspice-client/dimensions"
import { createPanelDimensionDispatcher } from "../../src/auspice-client/dimensions"

describe("panel dimension updates", () => {
  test("test_dimensions_coalesces_measurements_before_the_next_frame", () => {
    const scheduler = createManualFrameScheduler()
    const actual: PanelDimensions[] = []
    const dispatcher = createPanelDimensionDispatcher((dimensions) => {
      actual.push(dimensions)
    }, scheduler.schedule)

    dispatcher.update({ width: 1_000, height: 700, docHeight: 700 })
    dispatcher.update({ width: 1_100, height: 720, docHeight: 720 })
    scheduler.flush()

    // Oracle: Resize Observer notifications run before rendering; one frame must use the latest size.
    // https://drafts.csswg.org/resize-observer/#html-event-loop
    expect(actual).toEqual([{ width: 1_100, height: 720, docHeight: 720 }])
  })

  test("test_dimensions_skips_unchanged_measurements", () => {
    const scheduler = createManualFrameScheduler()
    const actual: PanelDimensions[] = []
    const dispatcher = createPanelDimensionDispatcher((dimensions) => {
      actual.push(dimensions)
    }, scheduler.schedule)
    const initial = { width: 1_000, height: 700, docHeight: 700 }

    dispatcher.update(initial)
    scheduler.flush()
    dispatcher.update(initial)
    scheduler.flush()
    dispatcher.update({ width: 1_001, height: 700, docHeight: 700 })
    scheduler.flush()

    // Oracle: unchanged panel dimensions cannot alter Auspice's computed SVG geometry.
    expect(actual).toEqual([initial, { width: 1_001, height: 700, docHeight: 700 }])
  })

  test("test_dimensions_cancels_pending_measurement_when_disposed", () => {
    const scheduler = createManualFrameScheduler()
    const actual: PanelDimensions[] = []
    const dispatcher = createPanelDimensionDispatcher((dimensions) => {
      actual.push(dimensions)
    }, scheduler.schedule)

    dispatcher.update({ width: 1_000, height: 700, docHeight: 700 })
    dispatcher.dispose()
    scheduler.flush()

    // Oracle: ResizeObserver.disconnect() stops observations when the observed component unmounts.
    // https://drafts.csswg.org/resize-observer/#dom-resizeobserver-disconnect
    expect(actual).toEqual([])
  })
})

interface ManualFrameScheduler {
  readonly schedule: FrameScheduler
  flush(): void
}

function createManualFrameScheduler(): ManualFrameScheduler {
  let pending: (() => void) | undefined

  function schedule(callback: () => void): () => void {
    pending = callback
    return function cancel(): void {
      if (pending === callback) pending = undefined
    }
  }

  function flush(): void {
    const callback = pending
    pending = undefined
    callback?.()
  }

  return { schedule, flush }
}
