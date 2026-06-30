import { Contract, type FixedNumber, Interface } from "ethers"
import { chunked, imap, izip } from "itertools"

import {
  getEthersProvider,
  isNativeToken,
  parseAmountBytes,
} from "ethers-utils"
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { EVM_FAMILY } from "@/chain/types"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

type ChainId = number
type Address = string

export async function getAmounts(
  chainId: ChainId,
  tokens: ReadonlyMap<string, { readonly decimals: number }>,
  walletAddress: string,
): Promise<NormalizedAddressMap<Address, FixedNumber>> {
  const provider = getEthersProvider(chainId)

  const multicallAddress =
    AVAILABLE_CHAINS.get(chainId)?.contracts?.multicall3?.address
  if (!multicallAddress) {
    throw new Error(`No multicall address found for chain id ${chainId}`)
  }
  const contract = new Contract(multicallAddress, MULTICALL_ABI, provider)

  const callData = imap(tokens.keys(), (tokenAddress) =>
    getCallData(tokenAddress, walletAddress, multicallAddress),
  )
  const chunkedCallData = chunked(callData, MULTICALL_MAX_CALLS)

  const chunkedTokenAddresses = chunked(tokens.keys(), MULTICALL_MAX_CALLS)

  const balances = new NormalizedAddressMap<Address, FixedNumber>(EVM_FAMILY)
  await Promise.all(
    imap(
      izip(chunkedCallData, chunkedTokenAddresses),
      async ([callData, tokenAddresses]) => {
        const { returnData: chunkedBalances } =
          await contract.tryBlockAndAggregate(
            MULTICALL_REQUIRE_SUCCESS,
            callData,
          )

        for (let i = 0; i < callData.length; i += 1) {
          const tokenAddress = tokenAddresses[i]
          const { success, returnData } = chunkedBalances[i]
          if (!success) {
            console.error(
              `error retrieving returnData from token address ${tokenAddress}`,
            )
            continue
          }

          // Check if balance is zero
          const hexBalance = returnData.substring(0, 66)
          if (hexBalance === BYTES32_ZERO) {
            continue
          }

          const decimals = tokens.get(tokenAddress)?.decimals
          const balance = parseAmountBytes(hexBalance, decimals, false)

          balances.set(tokenAddress, balance)
        }
      },
    ),
  )

  return balances
}

function getCallData(
  tokenAddress: string,
  walletAddress: string,
  multicallAddress: string,
): readonly [string, string] {
  if (isNativeToken(tokenAddress)) {
    return [
      multicallAddress,
      BALANCE_INTERFACE.encodeFunctionData("getEthBalance", [walletAddress]),
    ] as const
  } else {
    return [
      tokenAddress,
      BALANCE_INTERFACE.encodeFunctionData("balanceOf", [walletAddress]),
    ] as const
  }
}

const BYTES32_ZERO =
  "0x0000000000000000000000000000000000000000000000000000000000000000"
const BALANCE_INTERFACE = new Interface([
  {
    constant: true,
    inputs: [{ name: "who", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "addr", type: "address" }],
    name: "getEthBalance",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
])

const MULTICALL_MAX_CALLS = 100
const MULTICALL_REQUIRE_SUCCESS = false
const MULTICALL_ABI = [
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall2.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "tryBlockAndAggregate",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32",
      },
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool",
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall2.Result[]",
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // {
  //   inputs: [
  //     {
  //       components: [
  //         {
  //           internalType: "address",
  //           name: "target",
  //           type: "address",
  //         },
  //         {
  //           internalType: "bytes",
  //           name: "callData",
  //           type: "bytes",
  //         },
  //       ],
  //       internalType: "struct Multicall2.Call[]",
  //       name: "calls",
  //       type: "tuple[]",
  //     },
  //   ],
  //   name: "aggregate",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "blockNumber",
  //       type: "uint256",
  //     },
  //     {
  //       internalType: "bytes[]",
  //       name: "returnData",
  //       type: "bytes[]",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [
  //     {
  //       components: [
  //         {
  //           internalType: "address",
  //           name: "target",
  //           type: "address",
  //         },
  //         {
  //           internalType: "bytes",
  //           name: "callData",
  //           type: "bytes",
  //         },
  //       ],
  //       internalType: "struct Multicall2.Call[]",
  //       name: "calls",
  //       type: "tuple[]",
  //     },
  //   ],
  //   name: "blockAndAggregate",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "blockNumber",
  //       type: "uint256",
  //     },
  //     {
  //       internalType: "bytes32",
  //       name: "blockHash",
  //       type: "bytes32",
  //     },
  //     {
  //       components: [
  //         {
  //           internalType: "bool",
  //           name: "success",
  //           type: "bool",
  //         },
  //         {
  //           internalType: "bytes",
  //           name: "returnData",
  //           type: "bytes",
  //         },
  //       ],
  //       internalType: "struct Multicall2.Result[]",
  //       name: "returnData",
  //       type: "tuple[]",
  //     },
  //   ],
  //   stateMutability: "nonpayable",
  //   type: "function",
  // },
  // {
  //   inputs: [
  //     {
  //       internalType: "uint256",
  //       name: "blockNumber",
  //       type: "uint256",
  //     },
  //   ],
  //   name: "getBlockHash",
  //   outputs: [
  //     {
  //       internalType: "bytes32",
  //       name: "blockHash",
  //       type: "bytes32",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getBlockNumber",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "blockNumber",
  //       type: "uint256",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getCurrentBlockCoinbase",
  //   outputs: [
  //     {
  //       internalType: "address",
  //       name: "coinbase",
  //       type: "address",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getCurrentBlockDifficulty",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "difficulty",
  //       type: "uint256",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getCurrentBlockGasLimit",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "gaslimit",
  //       type: "uint256",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getCurrentBlockTimestamp",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "timestamp",
  //       type: "uint256",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //
  //   inputs: [
  //     {
  //       internalType: "address",
  //       name: "addr",
  //       type: "address",
  //     },
  //   ],
  //   name: "getEthBalance",
  //   outputs: [
  //     {
  //       internalType: "uint256",
  //       name: "balance",
  //       type: "uint256",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [],
  //   name: "getLastBlockHash",
  //   outputs: [
  //     {
  //       internalType: "bytes32",
  //       name: "blockHash",
  //       type: "bytes32",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
  // {
  //   inputs: [
  //     {
  //       internalType: "bool",
  //       name: "requireSuccess",
  //       type: "bool",
  //     },
  //     {
  //       components: [
  //         {
  //           internalType: "address",
  //           name: "target",
  //           type: "address",
  //         },
  //         {
  //           internalType: "bytes",
  //           name: "callData",
  //           type: "bytes",
  //         },
  //       ],
  //       internalType: "struct Multicall2.Call[]",
  //       name: "calls",
  //       type: "tuple[]",
  //     },
  //   ],
  //   name: "tryAggregate",
  //   outputs: [
  //     {
  //       components: [
  //         {
  //           internalType: "bool",
  //           name: "success",
  //           type: "bool",
  //         },
  //         {
  //           internalType: "bytes",
  //           name: "returnData",
  //           type: "bytes",
  //         },
  //       ],
  //       internalType: "struct Multicall2.Result[]",
  //       name: "returnData",
  //       type: "tuple[]",
  //     },
  //   ],
  //   stateMutability: "view",
  //   type: "function",
  // },
]
