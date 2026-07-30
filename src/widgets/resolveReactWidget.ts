import type { HostedReactWidget } from "./hostTypes"

const isReactComponent = (value: unknown): value is HostedReactWidget => {
  if (typeof value === "function") return true
  if (!value || typeof value !== "object") return false
  return typeof (value as { $$typeof?: unknown }).$$typeof === "symbol"
}

/**
 * Resolves the reviewed export name and makes stale registry exports explicit.
 */
export const resolveReactWidget = (
  module: Record<string, unknown>,
  exportName: string,
): HostedReactWidget => {
  const exportedComponent = module[exportName]
  if (!isReactComponent(exportedComponent)) {
    throw new Error(
      `Widget module does not export React component ${exportName}`,
    )
  }
  return exportedComponent
}
