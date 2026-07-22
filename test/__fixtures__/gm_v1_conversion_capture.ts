import { resolve } from "node:path"

import { convertFromV1 } from "auspice/cli/server/convertJsonSchemas.js"
import { z } from "zod"

const fixtureDirectory = import.meta.dirname
const inputs = z
  .record(
    z.string(),
    z.object({
      meta: z.record(z.string(), z.unknown()),
      tree: z.record(z.string(), z.unknown()),
    }),
  )
  .parse(await Bun.file(resolve(fixtureDirectory, "gm_v1_conversion_inputs.json")).json())
const outputs = Object.fromEntries(
  Object.entries(inputs).map(([name, input]) => [name, convertFromV1(input)]),
)
const destination = process.argv.at(2)
if (destination === undefined) throw new Error("Output path is required.")
await Bun.write(destination, `${JSON.stringify(outputs, undefined, 2)}\n`)
