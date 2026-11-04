import type { Provider, TransactionResponse } from "ethers"
import { describe, expect, it, vi } from "vitest"

import { WalletWrapper } from "./WalletWrapper"

const address = "0x1111111111111111111111111111111111111111"
const tx = { to: address, value: BigInt(1), chainId: 1 }

const createSigner = () => ({
  address,
  signMessage: vi.fn(),
  signTypedData: vi.fn(),
  signTransaction: vi.fn(async () => "0xraw"),
})

describe("WalletWrapper.sendTransactionHash", () => {
  it("submits through external wallets and returns the wallet hash", async () => {
    const submitTransaction = vi.fn(async () => "0xwallethash")
    const signer = { ...createSigner(), submitTransaction }

    const hash = await new WalletWrapper(signer).sendTransactionHash(tx)

    expect(hash).toBe("0xwallethash")
    expect(submitTransaction).toHaveBeenCalledWith({ ...tx, from: address })
    expect(signer.signTransaction).not.toHaveBeenCalled()
  })

  it("defaults from to the connected address when the dApp omits it", async () => {
    const submitTransaction = vi.fn(async () => "0xwallethash")
    const signer = { ...createSigner(), submitTransaction }
    // tx has no `from` field.
    const txNoFrom = { to: address, value: BigInt(1), chainId: 1 }

    await new WalletWrapper(signer).sendTransactionHash(txNoFrom)

    expect(submitTransaction).toHaveBeenCalledWith({
      ...txNoFrom,
      from: address,
    })
  })

  it("rejects when the dApp supplies a from that differs from the connected account", async () => {
    const submitTransaction = vi.fn(async () => "0xwallethash")
    const signer = { ...createSigner(), submitTransaction }
    const differentAddress = "0x2222222222222222222222222222222222222222"
    const txWithWrongFrom = { ...tx, from: differentAddress }

    await expect(
      new WalletWrapper(signer).sendTransactionHash(txWithWrongFrom),
    ).rejects.toThrow(/does not match connected account/)
    expect(submitTransaction).not.toHaveBeenCalled()
  })

  it("accepts when the dApp supplies a from equal to the connected address", async () => {
    const submitTransaction = vi.fn(async () => "0xwallethash")
    const signer = { ...createSigner(), submitTransaction }
    const txWithMatchingFrom = { ...tx, from: address }

    await expect(
      new WalletWrapper(signer).sendTransactionHash(txWithMatchingFrom),
    ).resolves.toBe("0xwallethash")
  })

  it("signs and broadcasts locally for local-key signers", async () => {
    const signer = createSigner()
    const wrapper = new WalletWrapper(signer, {} as Provider)
    const sendTransaction = vi
      .spyOn(wrapper, "sendTransaction")
      .mockResolvedValue({ hash: "0xlocalhash" } as TransactionResponse)

    await expect(wrapper.sendTransactionHash(tx)).resolves.toBe("0xlocalhash")
    expect(sendTransaction).toHaveBeenCalledWith(tx)
  })
})
