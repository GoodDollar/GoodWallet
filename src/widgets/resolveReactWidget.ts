import type { HostedReactWidget } from "./hostTypes"

/**
 * Resolves the reviewed export name and makes stale registry exports explicit.
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
