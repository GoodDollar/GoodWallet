import fs from "node:fs/promises"

const packageJson = JSON.parse(
  await fs.readFile(new URL("../../package.json", import.meta.url), "utf8"),
)
const sections = ["dependencies", "devDependencies", "optionalDependencies"]
const invalid = []

// In-process widgets run with the wallet's origin and session capabilities.
// Exact versions make the reviewed package bytes reproducible via the lockfile.
for (const section of sections) {
  for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
    if (
      name.startsWith("@goodwidget/") &&
      !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)
    ) {
      invalid.push(`${section}.${name}=${version}`)
    }
  }
}

if (invalid.length > 0) {
  throw new Error(
    `GoodWidget packages must use exact stable versions:\n${invalid.join("\n")}`,
  )
}

console.log("GoodWidget dependency versions are exact.")
