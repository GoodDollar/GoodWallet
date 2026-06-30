const EIP5792_METHODS = {
  WALLET_GET_CAPABILITIES: "wallet_getCapabilities",
}

type CapabilityName = "atomicBatch" | "paymasterService" | "permissions"
type Capabilities = {
  [K in CapabilityName]?: {
    supported: boolean
    [key: string]: unknown
  }
}
type GetCapabilitiesResult = Record<string, Capabilities>

const supportedEIP5792CapabilitiesForEOA: Record<
  string,
  GetCapabilitiesResult
> = {
  // Not supporting any capabilities for now on EOA account
}

export { EIP5792_METHODS, supportedEIP5792CapabilitiesForEOA }
