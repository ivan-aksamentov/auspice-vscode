import { describe, expect, test } from "bun:test"

import fc from "fast-check"

import { newickToAuspiceJson } from "../../src/auspice-client/newick"

describe("Newick conversion properties", () => {
  test("test_prop_newick_preserves_tip_count_and_branch_lengths", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1_000 }), { minLength: 2, maxLength: 30 }),
        (lengths) => {
          const source = `(${lengths.map((length, index) => `tip${index}:${length}`).join(",")});`
          const actual = newickToAuspiceJson("generated.nwk", source)
          const tips = actual.tree.children ?? []

          expect(tips).toHaveLength(lengths.length)
          expect(tips.map((tip) => tip.name)).toEqual(lengths.map((_, index) => `tip${index}`))
          expect(tips.map((tip) => tip.node_attrs.div)).toEqual(lengths)
        },
      ),
      { numRuns: 200, seed: 20_260_721 },
    )
  })
})
