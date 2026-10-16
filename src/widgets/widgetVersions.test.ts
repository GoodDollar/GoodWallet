import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { WIDGETS } from "./registry"

/**
 * A widget records its version in three places: the `package.json` dependency,
 * `packageVersion` in the registry, and the Vitest register mocks. Nothing
 * else keeps them in step, and the registry copy is a Custom Element
 * registration cache key, so a stale one is a real defect rather than a
 * cosmetic one.
 *
 * This makes the disagreement fail in CI instead of at runtime.
 */

const repoRoot = process.cwd()

const dependencies: Record<string, string> = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
).dependencies

/** Not published; it only exists to host Playwright runs. */
const UNPUBLISHED_PACKAGES = new Set(["@goodwidget/test-fixture"])

const installedWidgets = WIDGETS.filter(
  (widget) => !UNPUBLISHED_PACKAGES.has(widget.packageName),
)

describe("widget package versions", () => {
  it.each(
    installedWidgets.map((widget) => [widget.packageName, widget]),
  )("%s is registered at the installed version", (packageName, widget) => {
    expect(dependencies[packageName as string]).toBe(widget.packageVersion)
  })

  it("pins every widget dependency to an exact version", () => {
    for (const widget of installedWidgets) {
      expect(dependencies[widget.packageName]).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it("keeps register mocks on the installed version", () => {
    const fixturesDir = path.join(repoRoot, "src/widgets/fixtures")
    const mocks = readdirSync(fixturesDir).filter((name) =>
      name.endsWith("RegisterMock.ts"),
    )

    for (const mock of mocks) {
      const source = readFileSync(path.join(fixturesDir, mock), "utf8")
      const declared = source.match(
        /packageName:\s*"(@goodwidget\/[^"]+)",\s*\n\s*packageVersion:\s*"([^"]+)"/,
      )
      expect(declared, `${mock} declares goodWidgetMetadata`).not.toBeNull()
      if (!declared) continue

      const [, packageName, packageVersion] = declared
      // A mock may outlive the registry entry it stood in for; only assert
      // against packages still installed.
      if (!dependencies[packageName]) continue
      expect(packageVersion, `${mock} matches package.json`).toBe(
        dependencies[packageName],
      )
    }
  })
})
