/**
 * Vitest mock for `@goodwidget/streaming-widget/register`.
 *
 * The real module performs a Custom Element side-effect registration which
 * requires a browser DOM. This no-op stub satisfies the import during unit
 * tests without triggering DOM APIs.
 */
export const goodWidgetMetadata = {
  packageName: "@goodwidget/streaming-widget",
  packageVersion: "0.1.0",
}

export const register = (tagName?: string): string => tagName ?? "gw-streaming"
