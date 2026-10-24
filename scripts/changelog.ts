// CHANGELOG.md has one `## <title>` section per version, newest first. The `## Unreleased` section
// at the top collects the changes of the next release, and the release renames it to the version.
// The text of a version's section is the release notes of that version.

/** Title of the section that holds the changes of the next release */
export const UNRELEASED = "Unreleased"

/** Opening or closing line of a fenced code block: at least three backticks or tildes */
const FENCE = /^ {0,3}(?<marker>`{3,}|~{3,})/u

/** Return the changelog with its Unreleased section renamed to the version */
export function releaseChangelog(changelog: string, version: string): string {
  const sections = changelogSections(changelog)
  const unreleased = sections.at(0)
  if (unreleased?.title !== UNRELEASED) {
    throw new Error(
      `CHANGELOG.md has no "## ${UNRELEASED}" section at the top. Describe the changes of this release there and retry.`,
    )
  }
  if (unreleased.notes === "") {
    throw new Error(
      `The "## ${UNRELEASED}" section of CHANGELOG.md is empty. Describe the changes of this release there and retry.`,
    )
  }
  if (sections.some((section) => section.title === version)) {
    throw new Error(`CHANGELOG.md already has a "## ${version}" section.`)
  }
  return changelog.split("\n").with(unreleased.line, `## ${version}`).join("\n")
}

/** Return the release notes of a version: the text of its section, without the heading */
export function releaseNotes(changelog: string, title: string): string {
  const section = changelogSections(changelog).find((candidate) => candidate.title === title)
  if (section === undefined || section.notes === "") {
    throw new Error(`CHANGELOG.md has no notes under "## ${title}".`)
  }
  return `${section.notes}\n`
}

function changelogSections(changelog: string): Section[] {
  const lines = changelog.split("\n")
  const headings = headingLines(lines)
  return headings.map((line, index) => ({
    title: (lines[line] ?? "").slice("## ".length).trim(),
    line,
    notes: lines
      .slice(line + 1, headings[index + 1] ?? lines.length)
      .join("\n")
      .trim(),
  }))
}

/** Return the indices of the `## ` heading lines, skipping fenced code blocks */
function headingLines(lines: readonly string[]): number[] {
  let fence: string | undefined
  return lines.flatMap((line, index) => {
    const marker = FENCE.exec(line)?.groups?.["marker"]
    if (fence === undefined) {
      fence = marker
      return marker === undefined && line.startsWith("## ") ? [index] : []
    }
    if (marker !== undefined && closesFence(fence, marker, line)) {
      fence = undefined
    }
    return []
  })
}

/** Return whether the line closes the code block of the fence, as in CommonMark */
function closesFence(fence: string, marker: string, line: string): boolean {
  return marker.startsWith(fence) && line.trim() === marker
}

interface Section {
  readonly title: string
  /** Index of the heading line */
  readonly line: number
  /** Text below the heading, without the surrounding blank lines */
  readonly notes: string
}
