# GoodWidget integration automation

GoodWallet accepts the strict GoodWidget package integration descriptor `2.0.0`.
The executable consumer schema is `scripts/widget-release/contract.mjs`; the
canonical producer schema is
`GoodWidget/schemas/widget-integration-manifest.schema.json`.

## Shared contract

The descriptor deliberately advertises only immutable identity and importable
package entry points:

```json
{
  "schemaVersion": "2.0.0",
  "hostContractVersion": "1.0.0",
  "widgetId": "goodwidget.goodreserve",
  "packageName": "@goodwidget/goodreserve-widget",
  "entries": {
    "react": { "export": "GoodReserveWidget" },
    "webComponent": {
      "registerPath": "./register",
      "tagName": "gw-goodreserve-widget"
    }
  }
}
```

The release envelope contains the values that exist only after npm publication:

```json
{
  "descriptor": "<the package integration descriptor>",
  "version": "1.2.3",
  "integrity": "sha512-...",
  "sourceSha": "<40-character commit SHA>",
  "releaseUrl": "https://github.com/GoodDollar/GoodWidget/tree/<package-tag>",
  "idempotencyKey": "@goodwidget/package@1.2.3"
}
```

Wallet routes, labels, icons, integration-mode selection, provider permissions,
and tests are not controlled by this payload. The intake validates the
configured service-user actor, schema and host-contract compatibility, package
scope, npm `latest`, exact npm version/integrity, duplicate issues/tasks, and
the current registry. It contains no release secret in pull-request jobs.

## Integration-mode selection

GoodWallet supports both declared package entries through generic hosts. Web
Components are the default; a reviewed registry entry may override one widget
to React:

```ts
{
  widgetId: "goodwidget.goodreserve",
  packageName: "@goodwidget/goodreserve-widget",
  packageVersion: "1.2.3",
  integrationMode: "react", // omit to use the Web Component default
  entries: {
    react: {
      exportName: "GoodReserveWidget",
      load: () => import("@goodwidget/goodreserve-widget"),
    },
    webComponent: {
      tagName: "gw-goodreserve-widget",
      load: () => import("@goodwidget/goodreserve-widget/register"),
    },
  },
  // Wallet-owned route, presentation and providerPolicy follow.
}
```

Both loaders are added for a new widget so changing mode later is a Wallet-only
reviewed change. Both hosts receive the same restricted provider, theme
overrides, and public config. The Web Component host registers only in the
browser and assigns objects as properties rather than HTML attributes.

The intake explicitly classifies work before starting Copilot:

- absent registry entry → `new`, requiring a full integration pass;
- registered package with an older exact dependency → `update`, normally only
  version, lockfile, and registry-version changes;
- registered package at the exact released version → no task.

## Security ownership

GoodWallet exclusively owns:

- the restricted EIP-1193 method and chain allowlists;
- any narrower per-widget provider policy;
- authenticated routing and session access;
- exact installed versions and lockfile integrity;
- dashboard presentation and integration-mode selection;
- CODEOWNERS review and the merge decision.

The descriptor cannot request or broaden provider permissions. Widget-specific
loading, success, error, callbacks, events, fixtures, and selectors stay inside
GoodWidget and are not reproduced in the Wallet registry.

## Activation gate

Automatic task creation is intentionally disabled until all external
prerequisites are complete. Repository dispatch always validates, but reaches
the protected `widget-integration` environment only when
`ENABLE_GOODWIDGET_AGENT_TASKS` is exactly `true`. Before setting it:

1. Reconcile and merge dashboard PR #24 and mobile-overflow PR #39. PR #22 is
   unrelated (`frame-ancestors` only); #39's old assertion predates #24's
   grid/More drawer.
2. Protect `widget-integration` with required maintainer approval.
3. Configure `GOODWIDGET_DISPATCH_ACTOR` to the dedicated dispatch service user.
4. Confirm Copilot Business/Enterprise and configure its fine-grained
   `COPILOT_AGENT_TASK_PAT` with only `Agent tasks: write` for GoodWallet.
5. Publish and npm-verify GoodReserve, then use manual `workflow_dispatch` with
   `action=agent-task` and the explicit confirmation. Confirm it creates a
   reviewable draft PR.

The Agent Tasks API is public preview. If it or the entitlement/token is
unavailable, processing creates a structured issue. Manual replay supports
validation, structured-issue fallback, and an explicitly confirmed agent task.
All modes deduplicate on `<package>@<version>`. Intake runs are serialized and
create a durable tracking issue before calling Agent Tasks, preventing a replay
from starting a second task during the gap before the first task opens its PR.

## Review boundary

The custom agent may edit a widget integration, route, icon, exact dependency,
lockfile, Wallet-owned registry entry, and host-level tests. It cannot edit
authentication/session internals, deployment/workflow configuration, or the
provider allowlist. Generated code runs on the Wallet origin, so CODEOWNERS
review and manual merge are mandatory.

No widget is pre-registered before a verified stable npm release. The initial
GoodReserve integration remains reserved for the end-to-end rehearsal.
