/**
 * Convert repository state into one explicit Copilot task type.
 *
 * package.json is authoritative for the installed version; registry.ts proves
 * that the package is actually exposed as a Wallet widget. Checking both
 * avoids matching an unrelated widget that happens to use the same version.
 */
export function classifyIntegrationTask({
  registrySource,
  packageName,
  installedVersion,
  targetVersion,
}) {
  const packageAlreadyRegistered = registrySource.includes(
    `packageName: "${packageName}"`,
  )

  return {
    alreadyIntegrated:
      packageAlreadyRegistered && installedVersion === targetVersion,
    integrationTaskType: packageAlreadyRegistered ? "update" : "new",
  }
}
