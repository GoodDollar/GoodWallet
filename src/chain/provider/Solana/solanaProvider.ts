import {
  getPrimaryDomain,
  resolveDomain,
} from "@solana-name-service/sns-sdk-kit"
import { FixedNumber } from "ethers"
import {
  type Address,
  compileTransaction,
  address as createAddress,
  createNoopSigner,
  createSolanaClient,
  createTransaction,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  isAddress,
  lamports,
  type MicroLamports,
  type Transaction,
  type TransactionMessageBytesBase64,
} from "gill"
import { getTransferSolInstruction } from "gill/programs"
import {
  getAssociatedTokenAccountAddress,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs/token"

import { SOLANA_CHAIN_ID, SOLANA_DEVNET_CHAIN_ID } from "@/chain/chain-ids"
import { SOLANA_DEVNET_FAMILY, SOLANA_FAMILY } from "@/chain/types"
import { config } from "@/config"
import { parseAmount } from "@/ethers-utils"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

import { confirmTransaction } from "./solanaUtils"
import type { SolanaProvider, SUPPORTED_FAMILIES } from "./types"

const getUrlOrMoniker = (family: SUPPORTED_FAMILIES) => {
  switch (family) {
    case SOLANA_FAMILY:
      return config.solanaRpcsUrls[SOLANA_CHAIN_ID]
    case SOLANA_DEVNET_FAMILY:
      return config.solanaRpcsUrls[SOLANA_DEVNET_CHAIN_ID] ?? "devnet"
  }
}

export const getSolanaProvider = (
  family: SUPPORTED_FAMILIES,
): SolanaProvider => {
  const SolanaClient = createSolanaClient({
    urlOrMoniker: getUrlOrMoniker(family),
  })
  const { rpc } = SolanaClient

  const mintToProgramMap = new Map<Address, Address>()

  return {
    family,
    getAddressForName: async (name: string) => {
      return resolveDomain({ rpc, domain: name })
    },
    getNameForAddress: async (address: string) => {
      try {
        return (
          await getPrimaryDomain({ rpc, walletAddress: createAddress(address) })
        ).domainName
      } catch (e) {
        console.warn(`Failed to get Name for Address ${address}`, e)
        return null
      }
    },
    isValidAddress: isAddress,
    getAmounts: async (_, tokensOfChain, address) => {
      const amountsForChain = new NormalizedAddressMap<string, FixedNumber>(
        family,
      )
      const ownerAddress = createAddress(address)

      const [
        solanaBalanceResponse,
        tokenAccountsResponse,
        tokenAccounts22Response,
      ] = await Promise.all([
        rpc.getBalance(ownerAddress).send(),
        rpc
          .getTokenAccountsByOwner(
            ownerAddress,
            { programId: TOKEN_PROGRAM_ADDRESS },
            { encoding: "jsonParsed" },
          )
          .send(),
        rpc
          .getTokenAccountsByOwner(
            ownerAddress,
            { programId: TOKEN_2022_PROGRAM_ADDRESS },
            { encoding: "jsonParsed" },
          )
          .send(),
      ])

      const solanaNative = tokensOfChain.native
      if (solanaNative && solanaBalanceResponse.value > 0) {
        const amount = parseAmount(
          solanaBalanceResponse.value,
          solanaNative.decimals,
        )
        amountsForChain.set(solanaNative.address, amount)
      }

      const combined = [
        ...tokenAccountsResponse.value,
        ...tokenAccounts22Response.value,
      ]
      for (const tokenAccount of combined) {
        if (tokenAccount.account.data.program.startsWith("spl-token")) {
          const { mint, tokenAmount } = tokenAccount.account.data.parsed.info

          if (tokensOfChain.get(mint) === undefined) {
            continue
          }

          mintToProgramMap.set(mint, tokenAccount.account.owner)
          const amount = parseAmount(tokenAmount.amount, tokenAmount.decimals)
          if (amount.gt(FixedNumber.fromValue(0))) {
            amountsForChain.set(mint, amount)
          }
        }
      }
      return amountsForChain
    },
    getTransactions: async (_, address) => {
      try {
        const res = await fetch(
          `/api/chains/${family}/addresses/${address}/history`,
        )
        if (res.status === 200) return await res.json()
        return []
      } catch (error) {
        console.error(error)
      }
      return []
    },

    createSendSolTransaction: async (
      source,
      destination,
      amount,
    ): Promise<Transaction> => {
      const noopSourceSigner = createNoopSigner(source)
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
      const tx = createTransaction({
        version: "legacy",
        feePayer: noopSourceSigner,
        instructions: [
          getTransferSolInstruction({
            source: noopSourceSigner,
            destination,
            amount,
          }),
        ],
        //Valid for 90 seconds - see durable nonces
        latestBlockhash,
      })
      return compileTransaction(tx)
    },

    createSendSplTransaction: async (
      source,
      destination,
      mint,
      tokenProgram,
      amount,
    ): Promise<Transaction> => {
      const noopSourceSigner = createNoopSigner(source)
      const sourceAta = await getAssociatedTokenAccountAddress(
        mint,
        source,
        tokenProgram,
      )

      const destinationAta = await getAssociatedTokenAccountAddress(
        mint,
        destination,
        tokenProgram,
      )

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
      const tx = createTransaction({
        feePayer: noopSourceSigner,
        version: "legacy",
        instructions: [
          // create idempotent will gracefully fail if the ata already exists. this is the gold standard!
          getCreateAssociatedTokenIdempotentInstruction({
            mint,
            payer: noopSourceSigner,
            tokenProgram,
            owner: destination,
            ata: destinationAta,
          }),
          getTransferInstruction(
            {
              source: sourceAta,
              authority: noopSourceSigner,
              destination: destinationAta,
              amount,
            },
            { programAddress: tokenProgram },
          ),
        ],
        //Valid for 90 seconds - see durable nonces
        latestBlockhash,
      })
      return compileTransaction(tx)
    },

    getTokenProgramForMint: (source, mint) => {
      const program = mintToProgramMap.get(mint)
      if (!program) {
        throw new Error(
          `No token program found for mint ${mint} owned by ${source}`,
        )
      }
      return program
    },

    getBaseFee: async (tx) => {
      const base64EncodedMessage = getBase64Decoder().decode(
        tx.messageBytes,
      ) as TransactionMessageBytesBase64
      const response = await rpc.getFeeForMessage(base64EncodedMessage).send()
      if (!response.value) {
        throw new Error("Failed to fetch base fee for the transaction")
      }
      return lamports(response.value)
    },

    getPrioritizationFee: async () => {
      const response = await rpc.getRecentPrioritizationFees().send()
      if (!response.values) {
        throw new Error("Failed to fetch prioritization fee")
      }

      const responseArray = Array.from(response.values())
      if (responseArray.length === 0) {
        return BigInt(0) as MicroLamports
      }
      let accumulatedFee = BigInt(0)
      for (const fee of responseArray) {
        accumulatedFee += fee.prioritizationFee
      }
      const avgFee = accumulatedFee / BigInt(responseArray.length)
      return avgFee as MicroLamports
    },

    getComputeUnits: async (tx) => {
      const simulationResult = await SolanaClient.simulateTransaction(tx)
      return simulationResult.value.unitsConsumed ?? BigInt(0)
    },

    getAtaCreationCost: async (destination, mint, tokenProgram) => {
      const destinationAta = await getAssociatedTokenAccountAddress(
        mint,
        destination,
        tokenProgram,
      )
      const balance = await rpc.getBalance(destinationAta).send()
      if (balance.value <= BigInt(0)) {
        return await rpc.getMinimumBalanceForRentExemption(BigInt(165)).send()
      }
      return lamports(BigInt(0))
    },

    broadcastTransaction: async (tx) => {
      const encodedTx = getBase64EncodedWireTransaction(tx)
      const signature = await rpc
        .sendTransaction(encodedTx, { encoding: "base64" })
        .send()
      await confirmTransaction(SolanaClient, signature, "finalized")
      return signature
    },
  }
}
