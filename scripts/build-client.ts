import { access, readFile } from "node:fs/promises"
import { dirname, extname, resolve } from "node:path"

import { transformAsync } from "@babel/core"

import { CLIENT_BUNDLE_FILE, CLIENT_FAVICON_FILE, CLIENT_LOGO_FILE } from "../src/auspiceAssets.js"

const extensionRoot = resolve(import.meta.dirname, "..")
const clientRoot = resolve(extensionRoot, "src", "auspice-client")
const outputRoot = resolve(extensionRoot, "dist", "auspice-client")

// Auspice's source is authored for its own webpack build: it aliases `@auspice`
// to its `src` and `@extensions` to the embedding app. We reproduce those two
// aliases and load `.css` the way webpack's style-loader would (inject a <style>
// at runtime), inlining `url(...)` assets so nothing depends on a served path.
const auspicePlugin: Bun.BunPlugin = {
  name: "auspice-source",
  setup(build) {
    build.onResolve({ filter: /^@auspice\//u }, (args) => ({
      // Route through Bun's resolver so extensions and directory indexes resolve
      // (a bare joined path would be treated as a literal file).
      path: Bun.resolveSync(`auspice/src/${args.path.slice("@auspice/".length)}`, extensionRoot),
    }))
    build.onResolve({ filter: /^@extensions$/u }, () => ({
      path: resolve(clientRoot, "extensions-registry.tsx"),
    }))
    // Auspice's source is written for its Babel build: legacy (`@connect`)
    // decorators and class properties. Bun's transpiler applies the newer TC39
    // decorator semantics, which throws at runtime, so transform Auspice's source
    // with Babel first (the same presets/plugins Auspice uses, minus dev-only and
    // polyfill concerns). Modules stay ESM so Bun still bundles them.
    build.onLoad({ filter: /auspice\/src\/.*\.[jt]sx?$/u }, async (args) => {
      const source = await readFile(args.path, "utf8")
      const result = await transformAsync(source, {
        filename: args.path,
        babelrc: false,
        configFile: false,
        sourceMaps: false,
        presets: [
          ["@babel/preset-typescript", { allowDeclareFields: true }],
          "@babel/preset-react",
        ],
        plugins: [
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          "@babel/plugin-proposal-class-properties",
        ],
      })
      return { contents: result?.code ?? source, loader: "js" }
    })
    // The official v1 converter imports CLI logging utilities which depend on
    // Node APIs. Its conversion logic is browser-safe, so route that one import
    // to the webview logger while retaining the version-pinned converter itself.
    build.onResolve({ filter: /^\.\.\/utils$/u }, (args) =>
      args.importer.endsWith("/auspice/cli/server/convertJsonSchemas.js")
        ? { path: resolve(clientRoot, "auspice-cli-utils.ts") }
        : undefined,
    )
    // react-collapsible's CommonJS entry exports `{ default: Component }`.
    // Bun preserves that wrapper as the default import, so React receives an
    // object when Auspice renders footer filters. Normalize the package to a
    // conventional CommonJS component export while bundling.
    build.onLoad({ filter: /react-collapsible\/dist\/index\.js$/u }, async (args) => {
      const source = await readFile(args.path, "utf8")
      return { contents: `${source}\nmodule.exports = module.exports.default;`, loader: "js" }
    })
    build.onLoad({ filter: /\.css$/u }, async (args) => {
      const css = await inlineCssUrls(args.path)
      const contents = `const style = document.createElement("style");
style.textContent = ${JSON.stringify(css)};
document.head.appendChild(style);`
      return { contents, loader: "js" }
    })
    // Inline image/font imports as data URLs. VS Code webviews only serve
    // resources through `asWebviewUri`, so a bundler's relative asset URLs 403;
    // `data:` URLs are self-contained and permitted by the webview CSP.
    build.onLoad({ filter: /\.(?:png|jpe?g|gif|svg|woff2?|eot|otf|ttf)$/u }, async (args) => {
      const bytes = await readFile(args.path)
      const dataUrl = `data:${mediaType(extname(args.path))};base64,${bytes.toString("base64")}`
      // CommonJS export: Auspice loads images with `require("./x.png")` and uses
      // the result directly as an `<img src>`. An ESM `export default` would make
      // `require` return the module object ("[object Object]"), so export the
      // string as `module.exports`, which both `require` and `import` unwrap.
      return { contents: `module.exports = ${JSON.stringify(dataUrl)}`, loader: "js" }
    })
  },
}

export async function buildClient(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [resolve(clientRoot, "index.tsx")],
    outdir: outputRoot,
    target: "browser",
    format: "esm",
    minify: true,
    sourcemap: "none",
    naming: { entry: CLIENT_BUNDLE_FILE },
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.ENABLE_SERVICE_WORKER": "false",
      "process.env.SKIP_REDUX_CHECKS": "true",
    },
    plugins: [auspicePlugin],
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log.message)
    throw new AggregateError(result.logs, "Auspice client bundle failed")
  }
  await Bun.write(
    resolve(outputRoot, CLIENT_FAVICON_FILE),
    Bun.file(resolve(extensionRoot, "node_modules", "auspice", "favicon.png")),
  )
  // The pre-bundle placeholder in the webview shell shows this logo before the
  // client bundle runs; the webview only serves resources under its output root.
  await Bun.write(
    resolve(outputRoot, CLIENT_LOGO_FILE),
    Bun.file(resolve(extensionRoot, "assets", "img", "logo-256.png")),
  )
  await Promise.all(
    [CLIENT_BUNDLE_FILE, CLIENT_FAVICON_FILE, CLIENT_LOGO_FILE].map((file) =>
      access(resolve(outputRoot, file)),
    ),
  )
}

async function inlineCssUrls(cssPath: string): Promise<string> {
  const css = await readFile(cssPath, "utf8")
  const baseDir = dirname(cssPath)
  const references = [...css.matchAll(/url\((?<quote>['"]?)(?<ref>[^'")]+)\k<quote>\)/gu)]
  let result = css
  for (const match of references) {
    const reference = match.groups?.["ref"]
    if (reference === undefined || /^(?:data:|https?:|#)/u.test(reference)) continue
    const assetPath = resolve(baseDir, reference.split(/[?#]/u)[0] ?? reference)
    const dataUrl = await tryDataUrl(assetPath)
    if (dataUrl !== undefined) result = result.replace(match[0], `url(${dataUrl})`)
  }
  return result
}

async function tryDataUrl(assetPath: string): Promise<string | undefined> {
  try {
    const bytes = await readFile(assetPath)
    return `data:${mediaType(extname(assetPath))};base64,${bytes.toString("base64")}`
  } catch {
    return undefined
  }
}

function mediaType(ext: string): string {
  const table: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
  }
  return table[ext.toLowerCase()] ?? "application/octet-stream"
}

if (import.meta.main) await buildClient()
