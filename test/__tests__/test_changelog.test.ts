import { describe, expect, test } from "bun:test"

import { releaseChangelog, releaseNotes } from "../../scripts/changelog"

// Oracle of every expectation: the layout of CHANGELOG.md, one `## <title>` section per version,
// newest first, with `## Unreleased` at the top until a release renames it to its version
const CHANGELOG = lines(
  "# Changelog",
  "",
  "## Unreleased",
  "",
  "### Map",
  "",
  "- **Map**: draws offline",
  "",
  "## 0.2.0",
  "",
  "- **Downloads**: SVG button",
  "",
)

describe("changelog", () => {
  test("test_changelog_release_renames_the_unreleased_section_to_the_version", () => {
    const actual = releaseChangelog(CHANGELOG, "0.3.0")

    expect(actual).toBe(CHANGELOG.replace("## Unreleased", "## 0.3.0"))
  })

  test.each([
    ["no Unreleased section", lines("# Changelog", "", "## 0.2.0", "", "- Fix")],
    [
      "Unreleased below a version",
      lines("## 0.2.0", "", "- Fix", "", "## Unreleased", "", "- New"),
    ],
    [
      "only a heading in a code block",
      lines("```md", "## Unreleased", "```", "", "## 0.2.0", "- Fix"),
    ],
    [
      "only a heading in a code block that shows a shorter fence",
      lines("````md", "```", "## Unreleased", "```", "````", "", "## 0.2.0", "- Fix"),
    ],
  ])("test_changelog_release_refuses_a_changelog_with_%s", (_case, changelog) => {
    expect(() => releaseChangelog(changelog, "0.3.0")).toThrow(
      'CHANGELOG.md has no "## Unreleased" section at the top',
    )
  })

  test("test_changelog_release_refuses_an_empty_unreleased_section", () => {
    const changelog = lines("## Unreleased", "", "", "## 0.2.0", "", "- Fix")

    expect(() => releaseChangelog(changelog, "0.3.0")).toThrow(
      'The "## Unreleased" section of CHANGELOG.md is empty',
    )
  })

  test("test_changelog_release_refuses_a_version_that_has_a_section", () => {
    expect(() => releaseChangelog(CHANGELOG, "0.2.0")).toThrow(
      'CHANGELOG.md already has a "## 0.2.0" section',
    )
  })

  test("test_changelog_notes_hold_the_section_text_with_its_subsections", () => {
    const actual = releaseNotes(CHANGELOG, "Unreleased")

    expect(actual).toBe(lines("### Map", "", "- **Map**: draws offline", ""))
  })

  test("test_changelog_notes_of_the_last_section_end_with_the_file", () => {
    const actual = releaseNotes(CHANGELOG, "0.2.0")

    expect(actual).toBe(lines("- **Downloads**: SVG button", ""))
  })

  test("test_changelog_notes_keep_headings_of_code_blocks", () => {
    const changelog = lines(
      "## 0.3.0",
      "",
      "```md",
      "## Not a version",
      "```",
      "",
      "## 0.2.0",
      "- Fix",
    )

    const actual = releaseNotes(changelog, "0.3.0")

    expect(actual).toBe(lines("```md", "## Not a version", "```", ""))
  })

  test.each([
    ["a missing version", CHANGELOG],
    ["an empty section", lines("## 0.3.0", "", "## 0.2.0", "- Fix")],
  ])("test_changelog_notes_refuse_%s", (_case, changelog) => {
    expect(() => releaseNotes(changelog, "0.3.0")).toThrow(
      'CHANGELOG.md has no notes under "## 0.3.0"',
    )
  })
})

function lines(...text: readonly string[]): string {
  return text.join("\n")
}
