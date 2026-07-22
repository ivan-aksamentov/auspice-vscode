import newickParser from "phylotree/src/formats/newick.js"

export function newickToAuspiceJson(name: string, content: string): AuspiceJson {
  const normalized = validateDocument(name, content)
  const parsed = newickParser(normalized, { left_delimiter: "[", right_delimiter: "]" })
  if (parsed.error !== null || parsed.json === null) {
    throw new Error(parsed.error ?? `${name} does not contain a Newick tree.`)
  }
  const sourceRoot = parsed.json.children?.length === 1 ? parsed.json.children[0] : parsed.json
  if (sourceRoot === undefined) throw new Error(`${name} does not contain a Newick tree.`)
  const useDepth = branchLengthMode(sourceRoot) === "depth"
  const tree = convertTree(sourceRoot, useDepth)
  return {
    version: "2.0",
    meta: {
      title: name,
      panels: ["tree"],
      description: `Dataset generated locally from the Newick file "${name}".`,
    },
    tree,
  }
}

export interface AuspiceJson extends Record<string, unknown> {
  readonly version: string
  readonly meta: {
    readonly title: string
    readonly panels: readonly string[]
    readonly description: string
  }
  readonly tree: AuspiceNode
}

interface AuspiceNode {
  readonly name: string
  readonly node_attrs: { readonly div: number }
  readonly children?: readonly AuspiceNode[]
  readonly branch_attrs?: { readonly labels: { readonly support: string } }
}

interface NewickNode {
  readonly name?: string | null
  readonly attribute?: string
  readonly bootstrap_values?: string
  readonly children?: readonly NewickNode[]
}

function validateDocument(name: string, content: string): string {
  const normalized = content.trim()
  if (/^\[\s*&U\b/iu.test(normalized)) {
    throw new Error(`${name} is marked as unrooted. Root the tree before opening it in Auspice.`)
  }
  const withoutLeadingComments = normalized.replace(/^(?:\s*\[[^\]]*\])*\s*/u, "")
  if (!withoutLeadingComments.startsWith("(") || !withoutLeadingComments.endsWith(";")) {
    throw new Error(`${name} does not contain one complete Newick tree.`)
  }
  if (withoutLeadingComments.indexOf(";") !== withoutLeadingComments.length - 1) {
    throw new Error(`${name} contains more than one Newick tree.`)
  }
  return normalized
}

function branchLengthMode(root: NewickNode): "depth" | "length" {
  const pending = [...(root.children ?? [])]
  let present = 0
  let missing = 0
  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) continue
    if (node.attribute === undefined || node.attribute.trim() === "") missing += 1
    else {
      parseBranchLength(node.attribute)
      present += 1
    }
    pending.push(...(node.children ?? []))
  }
  if (present > 0 && missing > 0) {
    throw new Error(
      "Newick branch lengths are present on only part of the tree; add all lengths or remove all lengths.",
    )
  }
  return present === 0 ? "depth" : "length"
}

function parseBranchLength(attribute: string | undefined): number {
  if (attribute === undefined || attribute.trim() === "") return 0
  const normalized = attribute.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(normalized)) {
    throw new Error(`Invalid Newick branch length "${attribute.trim()}".`)
  }
  const value = Number(normalized)
  if (!Number.isFinite(value)) throw new Error(`Invalid Newick branch length "${normalized}".`)
  if (value < 0) {
    throw new Error(
      `Negative Newick branch length "${normalized}" is valid syntax but unsupported by Auspice divergence coordinates.`,
    )
  }
  return value
}

function convertTree(root: NewickNode, useDepth: boolean): AuspiceNode {
  const reservedNames = collectExplicitNames(root)
  const names = new Set<string>()
  let unnamed = 0
  function nextUnnamed(): string {
    let candidate: string
    do {
      unnamed += 1
      candidate = generatedNodeName(unnamed)
    } while (reservedNames.has(candidate) || names.has(candidate))
    return candidate
  }
  const output = createNode(root, 0, 0, true, useDepth, names, nextUnnamed)
  const pending: ConversionFrame[] = [{ source: root, target: output, depth: 0 }]
  while (pending.length > 0) {
    const frame = pending.pop()
    if (frame === undefined) continue
    const children = frame.source.children ?? []
    if (children.length === 0) continue
    const converted = children.map((child) =>
      createNode(
        child,
        frame.target.node_attrs.div,
        frame.depth + 1,
        false,
        useDepth,
        names,
        nextUnnamed,
      ),
    )
    frame.target.children = converted
    pending.push(
      ...children
        .map((source, index) => ({
          source,
          target: converted[index] ?? converted[0],
          depth: frame.depth + 1,
        }))
        .filter((item): item is ConversionFrame => item.target !== undefined),
    )
  }
  return output
}

function collectExplicitNames(root: NewickNode): ReadonlySet<string> {
  const names = new Set<string>()
  const pending = [root]
  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) continue
    const name = explicitNodeName(node)
    if (name !== undefined && names.has(name)) {
      throw new Error(`Duplicate Newick node label "${name}" cannot be joined to metadata safely.`)
    }
    if (name !== undefined) names.add(name)
    pending.push(...(node.children ?? []))
  }
  return names
}

interface MutableAuspiceNode {
  readonly name: string
  readonly node_attrs: { readonly div: number }
  children?: MutableAuspiceNode[]
  readonly branch_attrs?: { readonly labels: { readonly support: string } }
}

interface ConversionFrame {
  readonly source: NewickNode
  readonly target: MutableAuspiceNode
  readonly depth: number
}

function createNode(
  node: NewickNode,
  parentDivergence: number,
  depth: number,
  isRoot: boolean,
  useDepth: boolean,
  names: Set<string>,
  nextUnnamed: () => string,
): MutableAuspiceNode {
  const support = numericSupport(node)
  const explicitName = explicitNodeName(node)
  if (explicitName !== undefined && explicitName !== "" && names.has(explicitName)) {
    throw new Error(
      `Duplicate Newick node label "${explicitName}" cannot be joined to metadata safely.`,
    )
  }
  const name = explicitName === undefined || explicitName === "" ? nextUnnamed() : explicitName
  names.add(name)
  const divergence = isRoot
    ? 0
    : useDepth
      ? depth
      : parentDivergence + parseBranchLength(node.attribute)
  return {
    name,
    node_attrs: { div: divergence },
    ...(support === undefined ? {} : { branch_attrs: { labels: { support } } }),
  }
}

function explicitNodeName(node: NewickNode): string | undefined {
  if (numericSupport(node) !== undefined) return undefined
  const name = node.name?.trim()
  return name === "" ? undefined : name
}

function generatedNodeName(index: number): string {
  return index === 1 ? "NODE" : `NODE_${index}`
}

function numericSupport(node: NewickNode): string | undefined {
  if (node.children === undefined || node.children.length === 0) return undefined
  const value = node.bootstrap_values?.trim()
  return value !== undefined && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value) ? value : undefined
}
