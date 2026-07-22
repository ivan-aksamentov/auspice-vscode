import { describe, expect, test } from "bun:test"

import { newickToAuspiceJson } from "../../src/auspice-client/newick"

describe("newick conversion", () => {
  test("test_newick_converts_branch_lengths_to_cumulative_divergence", () => {
    const actual = newickToAuspiceJson("example.nwk", "((A:1,B:2):3,C:4);")

    // Newick lengths describe each edge; Auspice divergence is distance from the root.
    // Oracle: https://github.com/veg/phylotree.js/blob/fd0fa181a96ee0436527e8df7d61eb33053dc054/src/formats/newick.js
    const expected = {
      version: "2.0",
      meta: {
        title: "example.nwk",
        panels: ["tree"],
        description: 'Dataset generated locally from the Newick file "example.nwk".',
      },
      tree: {
        name: "root",
        node_attrs: { div: 0 },
        children: [
          {
            name: "NODE",
            node_attrs: { div: 3 },
            children: [
              { name: "A", node_attrs: { div: 4 } },
              { name: "B", node_attrs: { div: 5 } },
            ],
          },
          { name: "C", node_attrs: { div: 4 } },
        ],
      },
    }
    expect(actual).toEqual(expected)
  })

  test("test_newick_uses_depth_when_all_branch_lengths_are_absent", () => {
    const actual = newickToAuspiceJson("topology.newick", "((A,B),C);")

    expect(actual.tree.children?.at(0)?.node_attrs.div).toBe(1)
    expect(actual.tree.children?.at(0)?.children?.at(0)?.node_attrs.div).toBe(2)
  })

  test("test_newick_preserves_explicit_zero_branch_lengths", () => {
    const actual = newickToAuspiceJson("zero.nwk", "((A:0,B:0):0,C:0);")

    expect(actual.tree.children?.map((node) => node.node_attrs.div)).toEqual([0, 0])
    expect(actual.tree.children?.at(0)?.children?.map((node) => node.node_attrs.div)).toEqual([
      0, 0,
    ])
  })

  test("test_newick_preserves_support_and_ignores_root_edge", () => {
    const actual = newickToAuspiceJson("support.nwk", "((A:1,B:2)95:3,C:4)root:99;")

    expect(actual.tree).toEqual({
      name: "root",
      node_attrs: { div: 0 },
      children: [
        {
          name: "NODE",
          node_attrs: { div: 3 },
          branch_attrs: { labels: { support: "95" } },
          children: [
            { name: "A", node_attrs: { div: 4 } },
            { name: "B", node_attrs: { div: 5 } },
          ],
        },
        { name: "C", node_attrs: { div: 4 } },
      ],
    })
  })

  test("test_newick_accepts_standard_square_bracket_comments", () => {
    const actual = newickToAuspiceJson("comments.nwk", "[&R](A[tip]:1,B:2);")

    expect(actual.tree.children?.map((node) => node.name)).toEqual(["A", "B"])
  })

  test("test_newick_generated_names_avoid_explicit_labels", () => {
    const actual = newickToAuspiceJson("names.nwk", "((A:1,B:1):1,NODE:2);")

    expect(actual.tree.children?.map((node) => node.name)).toEqual(["NODE_2", "NODE"])
  })

  test.each([
    ["negative lengths", "(A:-1,B:2);", "valid syntax but unsupported"],
    ["mixed lengths", "(A:1,B);", "present on only part"],
    ["hex lengths", "(A:0x10,B:2);", "Invalid Newick branch length"],
    ["plain text", "hello", "does not contain one complete"],
    ["unrooted marker", "[&U](A:1,B:2,C:3);", "marked as unrooted"],
    ["duplicate labels", "(A:1,A:2);", "Duplicate Newick node label"],
  ])("test_newick_rejects_%s", (_case, source, expected) => {
    expect(() => newickToAuspiceJson("invalid.nwk", source)).toThrow(expected)
  })
})
