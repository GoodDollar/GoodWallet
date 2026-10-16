# Upgrading a widget

Widget upgrades are manual and deliberate: a developer picks the widget and the
version, and the workflow opens a pull request with the bump. Nothing is merged
automatically, and nothing upgrades on its own.

## Running an upgrade

Actions → **Upgrade widget** → *Run workflow*, then choose:

- **Widget** — a dropdown of every registered widget
- **Version** — an exact version like `0.1.2`, or `latest` (the default)

The run pins the version, refreshes `yarn.lock`, runs Biome and the unit tests,
and opens `bump/<package>-<version>`. The pull request then goes through the
normal checks and preview deployment like any other change.

`latest` resolves to whatever npm currently tags latest. An explicit version
that is not published fails at the lockfile step, and no pull request opens.

The widget list is a dropdown but versions are free text: GitHub renders the
run form from the workflow file before any code executes, so choices have to
be literals and cannot be fetched from npm.

## What a bump touches

A widget records its version in three places, and
`scripts/widget-release/sync-version.mjs` keeps them in step:

- `package.json` — the exact dependency pin
- `src/widgets/registry.ts` — `RegisteredWidget.packageVersion`
- `src/widgets/fixtures/*RegisterMock.ts` — the mocked `goodWidgetMetadata`

Route, icon, integration mode and `providerPolicy` are never touched. Those are
reviewed decisions that belong to whoever integrates the widget.

Locally:

```bash
yarn widgets:sync --package @goodwidget/streaming-widget --version 0.1.2
yarn install && yarn test
```

The script only accepts an exact `major.minor.patch` version of a
`@goodwidget/*` package, and will not invent a registry entry for a package
that has none.

## Guards

Two tests keep the moving parts honest, both inside `yarn test`:

- `src/widgets/widgetVersions.test.ts` — fails if `package.json`, the registry
  and the register mocks ever disagree about a version.
- `src/widgets/widgetUpgradeWorkflow.test.ts` — fails if a registered widget is
  missing from the workflow dropdown. A `workflow_dispatch` dropdown is static
  YAML and cannot be generated at runtime, so this is what stops it going
  stale.

## Adding a new widget

Registering a widget is a separate, reviewed change: add the dependency, a
`defineWidget` entry with its route, icon, Custom Element tag and provider
policy, a register mock plus its `vitest.config.ts` alias, and the entry in the
`WIDGETS` array. Add it to the workflow dropdown in the same pull request — the
guard test will remind you.

## Before the first run

Set **`WIDGET_AUTOMATION_TOKEN`** (`contents: write`, `pull-requests: write`).
Pull requests opened with the default `GITHUB_TOKEN` do not trigger
`pull_request` workflows, so the bump would land with no preview deployment or
Playwright run. The workflow falls back to `github.token`, but degraded.

## Note on GoodWidget

GoodWidget's release pipeline can dispatch a `goodwidget-released` event to
this repository. GoodWallet has no receiver for it — upgrades here are manual
by choice — so that dispatch currently goes nowhere. Leave
`ENABLE_GOODWALLET_DISPATCH` off on the GoodWidget side to avoid implying
otherwise.
