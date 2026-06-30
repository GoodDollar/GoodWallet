"use server"

import { lamportsToSol } from "gill"
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs/token"
import { z } from "zod"

import { SOLANA_CHAIN_ID, SOLANA_DEVNET_CHAIN_ID } from "@/chain/chain-ids"
import {
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
  type SUPPORTED_FAMILIES,
} from "@/chain/provider/Solana/types"
import { rpcConfig } from "@/configServerless"
import { SOLANA_NATIVE_ADDRESS } from "@/ethers-utils"

import { type Tx, TxDirection } from "./types"

const getChainId = (family: SUPPORTED_FAMILIES): number => {
  switch (family) {
    case SOLANA_FAMILY:
      return SOLANA_CHAIN_ID
    case SOLANA_DEVNET_FAMILY:
      return SOLANA_DEVNET_CHAIN_ID
  }
}

const SigRespSchema = z.object({
  result: z.array(
    z.object({
      signature: z.string(),
      blockTime: z.number().nullable(),
      err: z.unknown().nullable(),
    }),
  ),
})

const TokenBalanceSchema = z.object({
  mint: z.string(),
  owner: z.string(),
  uiTokenAmount: z.object({
    uiAmountString: z.string(),
  }),
})

const MetaSchema = z.object({
  fee: z.number(),
  preBalances: z.array(z.number()),
  postBalances: z.array(z.number()),
  preTokenBalances: z.array(TokenBalanceSchema).default([]),
  postTokenBalances: z.array(TokenBalanceSchema).default([]),
})

const AccountKeySchema = z.object({
  pubkey: z.string(),
})

const InstructionInfoSchema = z.object({
  source: z.string().optional(),
  destination: z.string().optional(),
  mint: z.string().optional(), // SPL token mint address
})

const ParsedInstructionSchema = z.object({
  type: z.string(),
  info: InstructionInfoSchema.optional(),
})

const InstructionSchema = z.object({
  programId: z.string().optional(),
  parsed: ParsedInstructionSchema.optional(),
})

const TransactionMessageSchema = z.object({
  accountKeys: z.array(AccountKeySchema).min(1),
  instructions: z.array(InstructionSchema).default([]),
})

const TransactionSchema = z.object({
  signatures: z.array(z.string()).min(1),
  message: TransactionMessageSchema,
})

const TransactionDataSchema = z.object({
  meta: MetaSchema,
  blockTime: z.number(),
  transaction: TransactionSchema,
})

const TxRespSchema = z.object({
  result: TransactionDataSchema.nullable(),
})

const fetchSigs = async (rpcUrl: string, address: string) => {
  try {
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [address, { limit: 50 }],
      }),
    })

    if (!resp.ok) return []

    const parsed = SigRespSchema.safeParse(await resp.json())
    return parsed.success ? parsed.data.result.filter((tx) => !tx.err) : []
  } catch (error) {
    console.error("Failed to fetch signatures:", error)
    return []
  }
}

const fetchTx = async (rpcUrl: string, signature: string) => {
  try {
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ],
      }),
    })

    if (!resp.ok) return null

    const parsed = TxRespSchema.safeParse(await resp.json())
    return parsed.success ? parsed.data.result : null
  } catch (error) {
    console.error("Failed to fetch transaction:", error)
    return null
  }
}

export const getAllSolanaTransactions = async (
  address: string,
  family: SUPPORTED_FAMILIES,
): Promise<Tx[]> => {
  try {
    const chainId = getChainId(family)
    const rpc = rpcConfig[chainId]
    if (!rpc) {
      throw new Error(`RPC config missing for Solana chain ID: ${chainId}`)
    }
    const { url: rpcUrl } = rpc
    const sigs = await fetchSigs(rpcUrl, address)
    const txs = await Promise.all(
      sigs.map((sig) => fetchTx(rpcUrl, sig.signature)),
    )
    return txs.flatMap((tx) => parseTx(tx, chainId, address))
  } catch (error) {
    console.error("Failed to fetch Solana transactions:", error)
    return []
  }
}

type TokenBalance = z.infer<typeof TokenBalanceSchema>
type Instruction = z.infer<typeof InstructionSchema>

// Get all SPL token mints where user's balance actually changed (more efficient)
const getUserTokenMintsWithChanges = (
  preTokenBalances: TokenBalance[],
  postTokenBalances: TokenBalance[],
  userAddress: string,
): Set<string> => {
  const parseAmount = (str?: string) => Number.parseFloat(str ?? "0")
  const mints = new Set<string>()

  // Build a map of user's pre-balances by mint
  const preBalanceMap = new Map<string, number>()
  for (const balance of preTokenBalances) {
    if (balance.owner === userAddress) {
      preBalanceMap.set(
        balance.mint,
        parseAmount(balance.uiTokenAmount.uiAmountString),
      )
    }
  }

  // Check post-balances and compare
  for (const balance of postTokenBalances) {
    if (balance.owner === userAddress) {
      const postAmount = parseAmount(balance.uiTokenAmount.uiAmountString)
      const preAmount = preBalanceMap.get(balance.mint) ?? 0

      if (postAmount !== preAmount) {
        mints.add(balance.mint)
      }
    }
  }

  // Check for tokens that disappeared (in pre but not in post)
  for (const [mint, preAmount] of preBalanceMap) {
    if (
      preAmount !== 0 &&
      !postTokenBalances.some((b) => b.owner === userAddress && b.mint === mint)
    ) {
      mints.add(mint)
    }
  }

  return mints
}

// Calculate SOL balance change
const calculateSolBalanceDelta = (
  preBalances: number[],
  postBalances: number[],
  accountKeys: z.infer<typeof AccountKeySchema>[],
  userAddress: string,
  fee: number,
): { amount: string; isOutgoing: boolean } | null => {
  const userIndex = accountKeys.findIndex(
    ({ pubkey }) => pubkey === userAddress,
  )
  if (userIndex === -1) return null

  const pre = preBalances[userIndex] ?? 0
  const post = postBalances[userIndex] ?? 0
  const change = post - pre

  if (change === 0) return null

  const isOutgoing = change < 0
  const absoluteChange = Math.abs(change)
  const actualTransfer = isOutgoing ? absoluteChange - fee : absoluteChange

  if (actualTransfer <= 0) return null

  return {
    amount: lamportsToSol(BigInt(actualTransfer)),
    isOutgoing,
  }
}

// Calculate SPL token balance change for specific mint (assumes balance changed)
const calculateSplBalanceDelta = (
  mint: string,
  preTokenBalances: TokenBalance[],
  postTokenBalances: TokenBalance[],
  userAddress: string,
): { amount: string; isOutgoing: boolean } => {
  const parseAmount = (str?: string) => Number.parseFloat(str ?? "0")

  const preToken = preTokenBalances.find(
    (b) => b.owner === userAddress && b.mint === mint,
  )
  const postToken = postTokenBalances.find(
    (b) => b.owner === userAddress && b.mint === mint,
  )

  const pre = parseAmount(preToken?.uiTokenAmount.uiAmountString)
  const post = parseAmount(postToken?.uiTokenAmount.uiAmountString)
  const change = post - pre

  return {
    amount: Math.abs(change).toString(),
    isOutgoing: change < 0,
  }
}

// Find SOL transfer instruction (System Program)
const findSolTransferInstruction = (
  instructions: Instruction[],
): Instruction | undefined => {
  return instructions.find(
    (ix) =>
      ix.programId === SOLANA_NATIVE_ADDRESS && ix.parsed?.type === "transfer",
  )
}

// Find SPL token transfer instruction for specific mint
const findSplTransferInstruction = (
  instructions: Instruction[],
  mint: string,
): Instruction | undefined => {
  return instructions.find(
    (ix) =>
      (ix.programId === TOKEN_PROGRAM_ADDRESS ||
        ix.programId === TOKEN_2022_PROGRAM_ADDRESS) &&
      (ix.parsed?.type === "transfer" ||
        ix.parsed?.type === "transferChecked") &&
      ix.parsed?.info?.mint === mint,
  )
}

// Extract source and destination from instruction
const extractCounterparty = (
  instruction: Instruction | undefined,
): { source: string; destination: string } => {
  const info = instruction?.parsed?.info
  return {
    source: info?.source ?? "",
    destination: info?.destination ?? "",
  }
}

const parseTx = (
  tx: z.infer<typeof TransactionDataSchema> | null,
  chainId: number,
  userAddress: string,
): Tx[] => {
  if (!tx) return []

  try {
    const balanceChanges: {
      amount: string
      isOutgoing: boolean
      tokenAddress: string
      from: string
      to: string
    }[] = []

    const { instructions, accountKeys } = tx.transaction.message
    const {
      preBalances,
      postBalances,
      preTokenBalances,
      postTokenBalances,
      fee,
    } = tx.meta

    // 1. Process native SOL balance change
    const solDelta = calculateSolBalanceDelta(
      preBalances,
      postBalances,
      accountKeys,
      userAddress,
      fee,
    )

    if (solDelta) {
      const solInstruction = findSolTransferInstruction(instructions)
      const { source, destination } = extractCounterparty(solInstruction)

      balanceChanges.push({
        ...solDelta,
        tokenAddress: SOLANA_NATIVE_ADDRESS,
        from: source,
        to: destination,
      })
    }

    // 2. Process each SPL token balance change
    const involvedMints = getUserTokenMintsWithChanges(
      preTokenBalances,
      postTokenBalances,
      userAddress,
    )

    for (const mint of involvedMints) {
      const splDelta = calculateSplBalanceDelta(
        mint,
        preTokenBalances,
        postTokenBalances,
        userAddress,
      )
      const splInstruction = findSplTransferInstruction(instructions, mint)
      const { source, destination } = extractCounterparty(splInstruction)

      balanceChanges.push({
        ...splDelta,
        tokenAddress: mint,
        from: source,
        to: destination,
      })
    }

    // 3. Transform balance changes to UI transaction objects
    return balanceChanges.map(
      ({ amount, isOutgoing, tokenAddress, from, to }) => ({
        chainId,
        hash: tx.transaction.signatures[0],
        timestamp: tx.blockTime,
        from,
        to,
        amount,
        tokenAddress,
        method: isOutgoing ? "Sent" : "Received",
        txDirection: isOutgoing ? TxDirection.OUTGOING : TxDirection.INCOMING,
      }),
    )
  } catch (error) {
    console.error("Failed to parse transaction:", error)
    return []
  }
}
