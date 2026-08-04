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

const createProvider = () => {
  const rpcRequest = vi.fn(async () => "0xresult")
  return {
    provider: new RestrictedEip1193Provider({
      signer,
      chainIds: [1, 42220],
      rpcRequest,
    }),
    rpcRequest,
  }
}

describe("RestrictedEip1193Provider", () => {
  it("exposes only the active account and forwards allowlisted reads", async () => {
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

  it("rejects unknown methods and mismatched signing accounts", async () => {
    const { provider } = createProvider()
    await expect(
      provider.request({ method: "wallet_getSeed" }),
    ).rejects.toMatchObject({
      code: 4200,
    })
    await expect(
      provider.request({
        method: "personal_sign",
        params: ["0x12", "0x2222222222222222222222222222222222222222"],
      }),
    ).rejects.toMatchObject({ code: 4100 })
  })

  it("rejects an incompatible provider contract at construction", () => {
    expect(
      () =>
        new RestrictedEip1193Provider({
          signer,
          chainIds: [1],
          requiredMethods: ["wallet_getSeed"],
        }),
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

  it("validates account and chain before transaction submission", async () => {
    const { provider, rpcRequest } = createProvider()
    await expect(
      provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, chainId: 1, to: address, value: BigInt(1) }],
      }),
    ).resolves.toBe("0xresult")
    expect(signer.signTransaction).toHaveBeenCalled()
    expect(rpcRequest).toHaveBeenCalledWith(1, {
      method: "eth_sendRawTransaction",
      params: ["0xraw"],
    })
  })

  it("validates the EIP-712 domain chain", async () => {
    const { provider } = createProvider()
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
  })
})
