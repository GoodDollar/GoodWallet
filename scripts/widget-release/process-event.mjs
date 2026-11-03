import fs from "node:fs/promises"

import { classifyIntegrationTask } from "./classify-task.mjs"
import { parseWidgetReleaseEnvelope } from "./contract.mjs"

const mode = process.argv[2] ?? "validate"
const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, "utf8"))
const isDispatch = process.env.GITHUB_EVENT_NAME === "repository_dispatch"

if (isDispatch) {
  // repository_dispatch identifies the caller only by sender login; pinning the
  // service user prevents arbitrary repository users from entering this flow.
  const expectedActor = process.env.GOODWIDGET_DISPATCH_ACTOR
  if (!expectedActor || event.sender?.login !== expectedActor) {
    throw new Error("repository_dispatch sender is not the configured service user")
  }
}

const rawPayload = isDispatch
  ? event.client_payload
  : JSON.parse(event.inputs?.payload ?? "{}")
const envelope = parseWidgetReleaseEnvelope(rawPayload)
const {
  descriptor,
  version,
  integrity,
  sourceSha,
  releaseUrl,
  idempotencyKey,
} = envelope

const registryResponse = await fetch(
  `https://registry.npmjs.org/${encodeURIComponent(descriptor.packageName)}`,
)
if (!registryResponse.ok) {
  throw new Error(`npm lookup failed with ${registryResponse.status}`)
}
const metadata = await registryResponse.json()
const published = metadata.versions?.[version]
if (!published) throw new Error("Released package version is not present on npm")
if (metadata["dist-tags"]?.latest !== version) {
  throw new Error("Released package is not npm latest")
}
if (published.dist?.integrity !== integrity) {
  throw new Error("Release integrity does not match npm")
}
if (!published.exports?.["."]) {
  throw new Error("Released package does not expose its declared React entry")
}
if (!published.exports?.[descriptor.entries.webComponent.registerPath]) {
  throw new Error(
    `Released package does not expose ${descriptor.entries.webComponent.registerPath}`,
  )
}

// Registry state is checked after npm release metadata validation so replaying
// an already integrated release exits without opening another issue or task.
const registrySource = await fs.readFile(
  new URL("../../src/widgets/registry.ts", import.meta.url),
  "utf8",
)
const walletPackageJson = JSON.parse(
  await fs.readFile(new URL("../../package.json", import.meta.url), "utf8"),
)
const installedVersion =
  walletPackageJson.dependencies?.[descriptor.packageName] ??
  walletPackageJson.optionalDependencies?.[descriptor.packageName] ??
  walletPackageJson.devDependencies?.[descriptor.packageName]
// Classify before creating the task so Copilot receives a narrow update brief
// for existing integrations and the full onboarding brief only for new ones.
const { alreadyIntegrated, integrationTaskType } = classifyIntegrationTask({
  registrySource,
  packageName: descriptor.packageName,
  installedVersion,
  targetVersion: version,
})

console.log(
  JSON.stringify({
    status: alreadyIntegrated ? "already-integrated" : "validated",
    integrationTaskType,
    idempotencyKey,
  }),
)
if (mode === "validate" || alreadyIntegrated) process.exit(0)

const repository = process.env.GITHUB_REPOSITORY
const githubToken = process.env.GITHUB_TOKEN
if (!repository || !githubToken) throw new Error("GitHub action context is missing")

const githubRequest = async (path, options = {}, token = githubToken) => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${JSON.stringify(body)}`)
  }
  return body
}

const search = await githubRequest(
  `/search/issues?q=${encodeURIComponent(
    `repo:${repository} in:title "${idempotencyKey}"`,
  )}`,
)
// Both intake issues and Agent-created PRs carry the package@version key, so
// either artifact is a durable replay marker.
if (search.total_count > 0) {
  console.log(`Existing task or issue found for ${idempotencyKey}`)
  process.exit(0)
}

const issueBody = [
  "## GoodWidget release awaiting integration",
  "",
  `Idempotency key: \`${idempotencyKey}\``,
  `Widget: \`${descriptor.widgetId}\``,
  `Package: \`${descriptor.packageName}@${version}\``,
  `Task type: \`${integrationTaskType}\``,
  `Source: \`${sourceSha}\``,
  `Integrity: \`${integrity}\``,
  `Release: ${releaseUrl}`,
  "",
  "The minimal package descriptor, release envelope, and npm metadata were validated. Integration remains human-reviewed.",
  "",
  "<details><summary>Validated package descriptor</summary>",
  "",
  "```json",
  JSON.stringify(descriptor, null, 2),
  "```",
  "</details>",
].join("\n")

const ensureAutomationLabel = async () => {
  const labelPath = `/repos/${repository}/labels/${encodeURIComponent(
    "automated-widget-integration",
  )}`
  try {
    await githubRequest(labelPath)
  } catch (error) {
    if (!String(error).includes("GitHub API 404:")) throw error
    try {
      await githubRequest(`/repos/${repository}/labels`, {
        method: "POST",
        body: JSON.stringify({
          name: "automated-widget-integration",
          color: "1d76db",
          description: "Human-reviewed GoodWidget integration automation",
        }),
      })
    } catch (createError) {
      // A serialized retry or maintainer may have created it between requests.
      if (!String(createError).includes("GitHub API 422:")) throw createError
    }
  }
}

const createIntakeIssue = async (reason) => {
  await ensureAutomationLabel()
  return await githubRequest(`/repos/${repository}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: `[widget-release] ${idempotencyKey}`,
      body: `${issueBody}\n\nAutomation fallback: ${reason}`,
      labels: ["automated-widget-integration"],
    }),
  })
}

if (mode === "issue") {
  await createIntakeIssue("manual structured-issue replay")
  process.exit(0)
}
if (mode !== "agent-task") throw new Error(`Unknown action mode: ${mode}`)

const agentToken = process.env.COPILOT_AGENT_TASK_PAT
if (!agentToken) {
  await createIntakeIssue("COPILOT_AGENT_TASK_PAT is not configured")
  process.exit(0)
}

const taskInstruction =
  integrationTaskType === "update"
    ? "This package is already integrated. Update the exact dependency, lockfile, and registry packageVersion. Preserve the reviewed integration mode, route, icon, presentation, and providerPolicy unless the release makes a host-level compatibility change necessary."
    : "This is a new widget. Add the exact dependency, both static entry loaders, a registry item using the default integration mode, route, icon, translations, reviewed providerPolicy, and host-level tests."

const prompt = [
  `Integrate ${idempotencyKey} into GoodWallet.`,
  `Task type: ${integrationTaskType}.`,
  "Follow .github/agents/widget-integrator.agent.md exactly.",
  taskInstruction,
  "Do not reproduce widget-specific loading, success, error, selector, fixture, callback, or event contracts in GoodWallet.",
  "Use the exact dependency version and preserve lockfile integrity.",
  "Select an existing semantic icon or add a local SVG; call out the choice for human review.",
  "Open a draft PR, apply the automated-widget-integration label, and request CODEOWNERS review. Never approve or merge.",
  "",
  "Validated package descriptor:",
  "```json",
  JSON.stringify(descriptor, null, 2),
  "```",
].join("\n")

// Create a durable marker before the preview API call. Combined with workflow
// concurrency and the search above, this deduplicates retries even while an
// Agent Task has not opened its PR yet.
const intakeIssue = await createIntakeIssue("Copilot Agent Task requested")

try {
  const task = await githubRequest(
    `/agents/repos/${repository}/tasks`,
    {
      method: "POST",
      body: JSON.stringify({
        prompt,
        base_ref: "main",
        custom_agent: "widget-integrator",
        create_pull_request: true,
      }),
    },
    agentToken,
  )
  console.log(`Created Copilot task ${task.html_url ?? task.id}`)
  await githubRequest(
    `/repos/${repository}/issues/${intakeIssue.number}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        body: `Copilot Agent Task created: ${task.html_url ?? task.id}`,
      }),
    },
  )
} catch (error) {
  await githubRequest(
    `/repos/${repository}/issues/${intakeIssue.number}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        body: `Structured-issue fallback: Agent Tasks API unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
    },
  )
}
