import type { HostedReactWidget } from "./hostTypes"

/**
 * Resolve the descriptor-declared React export from a dynamically imported
 * package module. Validation here turns a stale descriptor or broken package
 * export into a clear host error instead of trying to render `undefined`.
 */
export const resolveReactWidget = (
  module: Record<string, unknown>,
  exportName: string,
): HostedReactWidget => {
  const exportedComponent = module[exportName]
  if (typeof exportedComponent !== "function") {
    throw new Error(
      `Widget module does not export React component ${exportName}`,
    )
  }
  return exportedComponent as HostedReactWidget
}
