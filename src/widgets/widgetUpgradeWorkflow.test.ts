import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { WIDGETS } from "./registry"

/**
 * GitHub builds a `workflow_dispatch` dropdown from static YAML, so the widget
 * list in .github/workflows/widget-upgrade.yml cannot be generated from the
 * registry at runtime. This asserts the two agree, so adding a widget without
 * adding it to the dropdown fails here rather than leaving it unupgradeable.
 */

/** Not published; it only exists to host Playwright runs. */
const UNPUBLISHED_PACKAGES = new Set(["@goodwidget/test-fixture"])

const workflow = readFileSync(
  path.join(process.cwd(), ".github/workflows/widget-upgrade.yml"),
  "utf8",
)

// Deliberately a narrow parse rather than a YAML dependency: the options block
// is a fixed shape, and the test should not pull in a transitive package.
const dropdownOptions = (() => {
  const block = workflow.match(/options:\n((?:\s+- "@goodwidget\/[^"]+"\n)+)/)
  if (!block) return []
  return [...block[1].matchAll(/- "(@goodwidget\/[^"]+)"/g)].map(
    ([, name]) => name,
  )
})()

const expectedPackages = [
  ...new Set(
    WIDGETS.filter(
      (widget) => !UNPUBLISHED_PACKAGES.has(widget.packageName),
    ).map((widget) => widget.packageName),
  ),
].sort()

describe("widget upgrade workflow", () => {
  it("offers every registered widget", () => {
    expect([...dropdownOptions].sort()).toEqual(expectedPackages)
  })

  it("offers no widget that is not registered", () => {
    for (const option of dropdownOptions) {
      expect(expectedPackages).toContain(option)
    }
  })

  it("lists the options in a stable order", () => {
    expect(dropdownOptions).toEqual([...dropdownOptions].sort())
  })
})
