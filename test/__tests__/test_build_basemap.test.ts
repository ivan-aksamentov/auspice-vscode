import { describe, expect, test } from "bun:test"

import {
  countryLabels,
  countryOutlines,
  landBorders,
  roundGeometry,
} from "../../scripts/build-basemap"
import type { CountryFeature } from "../../scripts/build-basemap"

// A square country of about 2 km, and an island that rounding to 0.01 degree merges into a point
const country: CountryFeature = {
  properties: { NAME: "Squareland", LABEL_X: 8.204, LABEL_Y: 46.796, LABELRANK: 3 },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [8, 46],
          [8.021, 46],
          [8.021, 46.021],
          [8, 46.021],
          [8, 46],
        ],
      ],
      [
        [
          [9.001, 47.001],
          [9.002, 47.001],
          [9.002, 47.002],
          [9.001, 47.001],
        ],
      ],
    ],
  },
}

describe("build basemap", () => {
  test("test_build_basemap_rounds_outlines_and_drops_parts_that_merge_into_a_point", () => {
    const actual = countryOutlines([country])

    // Oracle: coordinates round to 0.01 degree; the island's positions all round to (9, 47)
    expect(actual).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Squareland" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [8, 46],
                  [8.02, 46],
                  [8.02, 46.02],
                  [8, 46.02],
                  [8, 46],
                ],
              ],
            ],
          },
        },
      ],
    })
  })

  test("test_build_basemap_keeps_each_line_of_a_border_a_line", () => {
    const actual = roundGeometry({
      type: "MultiLineString",
      coordinates: [
        [
          [1.001, 2.001],
          [1.004, 2.004],
          [1.5, 2.5],
        ],
        [
          [3, 4],
          [3.001, 4.001],
        ],
      ],
    })

    // Oracle: the first two positions round to (1, 2), and the second line to a single point
    expect(actual).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [1, 2],
          [1.5, 2.5],
        ],
      ],
    })
  })

  test("test_build_basemap_writes_borders_without_properties", () => {
    const actual = landBorders([
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    ])

    expect(actual.features).toEqual([
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
    ])
  })

  test.each([
    { LABELRANK: 2, rank: 1 },
    { LABELRANK: 3, rank: 2 },
    { LABELRANK: 4, rank: 3 },
    { LABELRANK: 7, rank: 3 },
  ])("test_build_basemap_ranks_country_labels %o", ({ LABELRANK, rank }) => {
    const actual = countryLabels([{ ...country, properties: { ...country.properties, LABELRANK } }])

    // Oracle: the map style shows rank 1 from zoom 1, rank 2 from zoom 2, rank 3 from zoom 3, as
    // the label layers of Auspice's default map style
    expect(actual.features).toEqual([
      {
        type: "Feature",
        properties: { name: "Squareland", rank },
        geometry: { type: "Point", coordinates: [8.2, 46.8] },
      },
    ])
  })
})
