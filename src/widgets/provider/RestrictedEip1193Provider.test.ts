import { describe, expect, it, vi } from "vitest"

vi.mock("@/chain/provider/EVM/viemClients", () => ({
  getViemClient: vi.fn(),
}))

import {
  RestrictedEip1193Provider,
  WidgetProviderError,
} from "./RestrictedEip1193Provider"

const address = "0x1111111111111111111111111111111111111111"
const signer = {
  address,
  signMessage: vi.fn(async () => "0xmessage"),
  signTypedData: vi.fn(async () => "0xtyped"),
  signTransaction: vi.fn(async () => "0xraw"),
}

const allTestMethods = [
  "eth_accounts",
  "eth_chainId",
  "eth_getBalance",
  "wallet_switchEthereumChain",
  "personal_sign",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
]

const createProvider = (
  options: Partial<
    ConstructorParameters<typeof RestrictedEip1193Provider>[0]
  > = {},
) => {
  const rpcRequest = vi.fn(async () => "0xresult")
  const requestWalletApproval = vi.fn(async () => true)
  return {
    provider: new RestrictedEip1193Provider({
      signer,
      chainIds: [1, 42220],
      rpcRequest,
      requestWalletApproval,
      ...options,
      requiredMethods: options.requiredMethods ?? allTestMethods,
    }),
    rpcRequest,
    requestWalletApproval,
  }
}

describe("RestrictedEip1193Provider", () => {
  it("exposes only the active account and forwards reviewed reads", async () => {
    const { provider, rpcRequest } = createProvider()
    await expect(provider.request({ method: "eth_accounts" })).resolves.toEqual(
      [address],
    )
    await expect(
      provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    ).resolves.toBe("0xresult")
    expect(rpcRequest).toHaveBeenCalledWith(1, {
      method: "eth_getBalance",
      params: [address, "latest"],
    })
  })

  it("enforces each widget's configured method subset", async () => {
    const { provider } = createProvider({
      requiredMethods: ["eth_accounts"],
    })
    await expect(
      provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    ).rejects.toMatchObject({ code: 4100 })
  })

  it("rejects unknown methods and incompatible provider contracts", async () => {
    const { provider } = createProvider()
    await expect(
      provider.request({ method: "wallet_getSeed" }),
    ).rejects.toMatchObject({ code: 4200 })
    expect(() =>
      createProvider({ requiredMethods: ["wallet_getSeed"] }),
    ).toThrow("unsupported provider methods")
  })

  it("allows only configured chain switches and emits normalized chain IDs", async () => {
    const { provider } = createProvider()
    const listener = vi.fn()
    provider.on("chainChanged", listener)
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xa4ec" }],
    })
    expect(listener).toHaveBeenCalledWith("0xa4ec")
    await expect(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }],
      }),
    ).rejects.toBeInstanceOf(WidgetProviderError)
  })

  it("requires account and chain validation plus Wallet approval for transactions", async () => {
    const { provider, requestWalletApproval, rpcRequest } = createProvider()
    await expect(
      provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, chainId: 1, to: address, value: BigInt(1) }],
      }),
    ).resolves.toBe("0xresult")
    expect(requestWalletApproval).toHaveBeenCalledWith(
      expect.objectContaining({ method: "eth_sendTransaction", chainId: 1 }),
    )
    expect(signer.signTransaction).toHaveBeenCalled()
    expect(rpcRequest).toHaveBeenCalledWith(1, {
      method: "eth_sendRawTransaction",
      params: ["0xraw"],
    })
  })

  it("keeps signing disabled until the Wallet explicitly approves it", async () => {
    const { provider } = createProvider({ requestWalletApproval: undefined })
    await expect(
      provider.request({
        method: "personal_sign",
        params: ["message", address],
      }),
    ).rejects.toMatchObject({ code: 4001 })
  })

  it("rejects mismatched signing accounts and typed-data chains before approval", async () => {
    const { provider, requestWalletApproval } = createProvider()
    await expect(
      provider.request({
        method: "personal_sign",
        params: ["message", "0x2222222222222222222222222222222222222222"],
      }),
    ).rejects.toMatchObject({ code: 4100 })
    await expect(
      provider.request({
        method: "eth_signTypedData_v4",
        params: [
          address,
          JSON.stringify({
            domain: { name: "Widget", chainId: 42220 },
            types: { Thing: [{ name: "value", type: "uint256" }] },
            message: { value: 1 },
          }),
        ],
      }),
    ).rejects.toMatchObject({ code: 4100 })
    expect(requestWalletApproval).not.toHaveBeenCalled()
  })
})
