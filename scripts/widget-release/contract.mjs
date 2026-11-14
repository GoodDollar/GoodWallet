import { z } from "zod"

// GoodWidget advertises identity and importable entry points only. GoodWallet
// remains authoritative for presentation, provider policy, tests, and mode selection.
const semver = /^[0-9]+\.[0-9]+\.[0-9]+$/
const identifier = /^goodwidget\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const packageName = /^@goodwidget\/[a-z0-9]+(?:-[a-z0-9]+)*$/
const exportName = /^[A-Z][A-Za-z0-9]*$/
const tagName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/
const sourceCommit = /^[0-9a-f]{40}$/
const integrity = /^sha512-[A-Za-z0-9+/]+={0,2}$/

export const widgetIntegrationDescriptorSchema = z
  .object({
    schemaVersion: z.literal("2.0.0"),
    hostContractVersion: z.string().regex(/^1\.[0-9]+\.[0-9]+$/),
    widgetId: z.string().regex(identifier),
    packageName: z.string().regex(packageName),
    entries: z
      .object({
        react: z
          .object({
            export: z.string().regex(exportName),
          })
          .strict(),
        webComponent: z
          .object({
            registerPath: z.literal("./register"),
            tagName: z.string().regex(tagName),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

export const widgetReleaseEnvelopeSchema = z
  .object({
    descriptor: widgetIntegrationDescriptorSchema,
    version: z.string().regex(semver),
    integrity: z.string().regex(integrity),
    sourceSha: z.string().regex(sourceCommit),
    releaseUrl: z
      .url()
      .refine((value) => new URL(value).protocol === "https:", {
        message: "Release URL must use HTTPS",
      }),
    idempotencyKey: z.string().min(1),
  })
  .strict()
  .superRefine((envelope, context) => {
    const expected = `${envelope.descriptor.packageName}@${envelope.version}`
    if (envelope.idempotencyKey !== expected) {
      context.addIssue({
        code: "custom",
        path: ["idempotencyKey"],
        message: `Expected ${expected}`,
      })
    }
  })

export const parseWidgetReleaseEnvelope = (payload) =>
  widgetReleaseEnvelopeSchema.parse(payload)
