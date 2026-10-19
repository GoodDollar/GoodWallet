/**
 * Vitest mock for `@goodwidget/ai-credits-widget/register`.
 *
 * The real module performs a Custom Element side-effect registration which
 * requires a browser DOM. This no-op stub satisfies the import during unit
 * tests without triggering DOM APIs.
 */
export const goodWidgetMetadata = {
  packageName: "@goodwidget/ai-credits-widget",
  packageVersion: "0.1.0",
}

export const register = (tagName?: string): string =>
  tagName ?? "ai-credits-widget"
