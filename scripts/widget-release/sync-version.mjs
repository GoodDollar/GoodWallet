/**
 * Pins a `@goodwidget/*` package to an exact version across every file in this
 * repo that records it, so the manifest and the widget registry cannot drift.
 *
 * Usage:
 *   node scripts/widget-release/sync-version.mjs --package @goodwidget/streaming-widget --version 0.1.2
 *   node scripts/widget-release/sync-version.mjs --package @goodwidget/streaming-widget --version latest
 *
 * Touched files:
 *   - package.json                              exact dependency pin
 *   - src/widgets/registry.ts                   RegisteredWidget.packageVersion
 *   - src/widgets/fixtures/*RegisterMock.ts     mocked goodWidgetMetadata
 *
 * `yarn.lock` is refreshed separately by the caller (`yarn install`).
 *
 * Exits 0 and reports `mode=new` when the package is not yet registered: that
 * path needs a human-authored registry entry (route, icon, provider policy),
 * so this script only adds the dependency and leaves the rest alone.
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"

const PACKAGE_NAME = /^@goodwidget\/[a-z0-9]+(?:-[a-z0-9]+)*$/
// Mirrors EXACT_PACKAGE_VERSION in src/widgets/registry.ts. Prerelease tags are
// rejected there, so they are rejected here too rather than failing later.
const EXACT_VERSION = /^\d+\.\d+\.\d+$/

const repoRoot = process.cwd()
const fixturesDir = path.join(repoRoot, "src/widgets/fixtures")
const manifestPath = path.join(repoRoot, "package.json")
const registryPath = path.join(repoRoot, "src/widgets/registry.ts")

const parseArgs = (argv) => {
  const args = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith("--")) continue
    const [flag, inlineValue] = token.slice(2).split("=")
    args.set(flag, inlineValue ?? argv[++index])
  }
  return args
}

const fail = (message) => {
  console.error(`sync-widget-version: ${message}`)
  process.exit(1)
}

const report = (entries) => {
  for (const [key, value] of Object.entries(entries)) {
    console.log(`${key}=${value}`)
  }
  if (!process.env.GITHUB_OUTPUT) return
  const lines = Object.entries(entries).map(([key, value]) => `${key}=${value}`)
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`)
}

/**
 * Rewrites `packageVersion` only where it sits directly beneath a matching
 * `packageName`, which is the shape used by both the registry entries and the
 * fixture mocks. Synthetic versions in unit tests are left untouched.
 */
const rewriteAdjacentVersion = (source, packageName, version) => {
  const pattern = new RegExp(
    `(packageName:\\s*"${packageName.replace("/", "\\/")}",\\s*\\n\\s*packageVersion:\\s*")([^"]+)(")`,
    "g",
  )
  let previous
  const next = source.replace(pattern, (_match, head, found, tail) => {
    previous = found
    return `${head}${version}${tail}`
  })
  // `found` means the package is declared here; `changed` means its recorded
  // version actually moved. A package already at the target version is found
  // but unchanged, and must not be mistaken for an unregistered one.
  return { next, previous, found: previous !== undefined, changed: next !== source }
}

/** `latest` is the default, so the common upgrade needs no version typed. */
const resolveLatest = async (packageName) => {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
  )
  if (!response.ok) fail(`npm lookup failed with ${response.status}`)
  const metadata = await response.json()
  const latest = metadata["dist-tags"]?.latest
  if (!latest) fail(`${packageName} has no npm latest tag`)
  console.log(`Resolved latest to ${packageName}@${latest}`)
  return latest
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const packageName = args.get("package")
  const requested = (args.get("version") ?? "latest").trim()

  if (!packageName) fail("--package is required")
  if (!PACKAGE_NAME.test(packageName)) {
    fail(`refusing to sync ${packageName}: not a @goodwidget/* package`)
  }

  const version =
    requested === "latest" ? await resolveLatest(packageName) : requested

  if (!EXACT_VERSION.test(version)) {
    fail(
      `refusing to sync ${version}: the widget registry requires an exact major.minor.patch version`,
    )
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const previousDependency = manifest.dependencies?.[packageName]
  const isNewPackage = previousDependency === undefined

  if (previousDependency === version) {
    console.log(`${packageName} is already pinned to ${version}`)
  }

  manifest.dependencies = Object.fromEntries(
    Object.entries({ ...manifest.dependencies, [packageName]: version }).sort(
      ([left], [right]) => left.localeCompare(right),
    ),
  )
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const changedFiles = ["package.json"]

  const registry = rewriteAdjacentVersion(
    readFileSync(registryPath, "utf8"),
    packageName,
    version,
  )
  if (registry.changed) {
    writeFileSync(registryPath, registry.next)
    changedFiles.push("src/widgets/registry.ts")
  }

  const fixtures = await readdir(fixturesDir)
  for (const fixture of fixtures.filter((name) =>
    name.endsWith("RegisterMock.ts"),
  )) {
    const fixturePath = path.join(fixturesDir, fixture)
    const mock = rewriteAdjacentVersion(
      readFileSync(fixturePath, "utf8"),
      packageName,
      version,
    )
    if (!mock.changed) continue
    writeFileSync(fixturePath, mock.next)
    changedFiles.push(path.relative(repoRoot, fixturePath))
  }

  report({
    mode: registry.found ? "update" : "new",
    package: packageName,
    // Matches the established bump/<widget>-<version> branch convention.
    "branch-slug": packageName.replace("@goodwidget/", ""),
    version,
    "previous-version": registry.previous ?? previousDependency ?? "none",
    "is-new-dependency": String(isNewPackage),
    "changed-files": changedFiles.join(","),
  })

  if (!registry.found) {
    console.log(
      `\n${packageName} has no entry in src/widgets/registry.ts.\n` +
        "Added the dependency only — registering a new widget needs a route slug,\n" +
        "icon, Custom Element tag and provider policy chosen by a human.",
    )
  }
}

await main()
