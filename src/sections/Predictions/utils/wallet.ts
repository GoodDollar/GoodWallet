import { encodeAbiParameters, getCreate2Address, keccak256 } from "viem"

// Polymarket's Gnosis Safe factory and the Solady init-code hash of the proxy it
// deploys. Both mirror the SDK's `production.walletDerivation`, so this returns
// the identical address the CLOB accepts as a GNOSIS_SAFE funder - the SDK
// derives Deposit Wallets for you but exposes no helper for legacy Safes.
const SAFE_FACTORY = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b" as const
const SAFE_INIT_CODE_HASH =
  "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf" as const

// The Safe a given EOA owns, whether or not it has been deployed.
export const deriveSafeAddress = (eoaAddress: `0x${string}`) =>
  getCreate2Address({
    from: SAFE_FACTORY,
    bytecodeHash: SAFE_INIT_CODE_HASH,
    // Lowercased because encodeAbiParameters rejects a mis-checksummed address,
    // and throwing here would quietly route a user who already has a Safe onto a
    // fresh Deposit Wallet, away from their funds. Case cannot affect the result.
    salt: keccak256(
      encodeAbiParameters(
        [{ name: "owner", type: "address" }],
        [eoaAddress.toLowerCase() as `0x${string}`],
      ),
    ),
  })
