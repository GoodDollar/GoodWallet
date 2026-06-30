import { formatJsonRpcError, type JsonRpcResponse } from "@json-rpc-tools/utils"
import type WalletKit from "@reown/walletkit"
import type { SignClientTypes } from "@walletconnect/types"
import {
  buildApprovedNamespaces,
  buildAuthObject,
  getSdkError,
  populateAuthPayload,
} from "@walletconnect/utils"

import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import { AVAILABLE_CHAINS, AVAILABLE_CHAINS_IDS } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import type { ISigner } from "@/login/types"
import { getCloseAfterWCAction } from "@/utils/reownAppKitWrapper"

import {
  BIP122_CHAINS,
  BIP122_MAINNET_CAIP2,
  BIP122_SIGNING_METHODS,
  BIP122_TESTNET_CAIP2,
} from "../data/BIP122Data"
import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from "../data/EIP155Data"
import { EIP5792_METHODS } from "../data/EIP5792Data"
import { SOLANA_CHAINS, SOLANA_SIGNING_METHODS } from "../data/SolanaData"
import { openWalletConnectDialog } from "../store/walletConnectDialogStore"
import { getInternalChainId } from "../utils/HelperUtils"
import { WalletWrapper } from "../utils/WalletWrapper"
import { approveBIP122Request } from "./BIP122RequestHandlerUtil"
import { approveEIP155Request } from "./EIP155RequestHandlerUtil"
import { approveEIP5792Request } from "./EIP5792RequestHandlerUtil"
import { approveSolanaRequest } from "./SolanaRequestHandlerUtil"

const getSupportedNamespaces = (signer: ISigner) => {
  const solanaChains: string[] = []
  const solanaAccounts: string[] = []

  for (const [internalChainId, walletConnectChainId] of SOLANA_CHAINS) {
    solanaChains.push(walletConnectChainId)
    const chain = AVAILABLE_CHAINS.get(internalChainId)
    if (!chain) {
      throw new Error(
        `Chain with id ${internalChainId} not found in AVAILABLE_CHAINS`,
      )
    }
    const address = signer[chain.family]?.address
    if (!address) {
      throw new Error(`Address for chain ${chain.name} not found in addresses`)
    }
    solanaAccounts.push(`${walletConnectChainId}:${address}`)
  }

  const bitcoinAccounts: string[] = []
  bitcoinAccounts.push(`${BIP122_MAINNET_CAIP2}:${signer.BTC.address}`)
  if (signer.BTC_TESTNET) {
    bitcoinAccounts.push(
      `${BIP122_TESTNET_CAIP2}:${signer.BTC_TESTNET.address}`,
    )
  }

  return {
    eip155: {
      chains: EIP155_CHAINS,
      methods: Object.values(EIP155_SIGNING_METHODS),
      events: ["accountsChanged", "chainChanged"],
      accounts: EIP155_CHAINS.map((chain) => `${chain}:${signer.EVM.address}`),
    },
    solana: {
      chains: solanaChains,
      methods: Object.values(SOLANA_SIGNING_METHODS),
      events: [],
      accounts: solanaAccounts,
    },
    bip122: {
      chains: Array.from(BIP122_CHAINS.values()),
      methods: Object.values(BIP122_SIGNING_METHODS),
      events: [],
      accounts: bitcoinAccounts,
    },
  }
}

export const setupListeners = (
  signer: ISigner,
  walletConnectInstance: WalletKit,
  refreshSessions: () => void,
) => {
  const evmWalletWrapper = new WalletWrapper(signer.EVM)
  const onSessionProposal = async (
    proposal: SignClientTypes.EventArguments["session_proposal"],
  ) => {
    const requiredChainIds: string[] = []
    const optionalChainIds: string[] = []
    const methods: string[] = []
    Object.values(proposal.params.requiredNamespaces).map((namespaces) => {
      requiredChainIds.push(...(namespaces.chains ?? []))
      methods.push(...namespaces.methods)
    })
    Object.values(proposal.params.optionalNamespaces).map((namespaces) => {
      optionalChainIds.push(...(namespaces.chains ?? []))
      methods.push(...namespaces.methods)
    })

    const safeIsChainSupported = (chainId: string) => {
      try {
        const internalChainId = getInternalChainId(chainId)
        return AVAILABLE_CHAINS_IDS.includes(internalChainId)
      } catch {
        return false
      }
    }

    const chainIds = [...requiredChainIds, ...optionalChainIds]
    const supportedChains = chainIds.filter(safeIsChainSupported)
    const nonSupportedChains = requiredChainIds.filter(
      (chain) => !safeIsChainSupported(chain),
    )

    if (nonSupportedChains.length > 0 || supportedChains.length === 0) {
      openWalletConnectDialog({
        type: "error",
        errorText:
          supportedChains.length === 0
            ? `No supported chain found in request`
            : `Chains not supported: ${nonSupportedChains}`,
        acceptBtnText: "Ok",
      })
      captureEvent({
        type: AnalyticsEventTypes.WalletConnectSessionProposal,
        origin: proposal.verifyContext.verified.origin,
        chainIds,
        methods,
        response: "error",
      })
      return
    }

    const status = await openWalletConnectDialog({
      type: "sessionProposal",
      sessionProposal: proposal,
      acceptBtnText: "Approve",
      rejectBtnText: "Reject",
    })

    if (status === "accepted") {
      try {
        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: getSupportedNamespaces(signer),
        })
        await walletConnectInstance.approveSession({
          id: proposal.id,
          namespaces: approvedNamespaces,
        })
      } catch (error) {
        openWalletConnectDialog({
          type: "error",
          errorText:
            error instanceof Error
              ? error.message
              : "An error occurred, please try again",
          acceptBtnText: "Ok",
        })
        captureEvent({
          type: AnalyticsEventTypes.WalletConnectSessionProposal,
          origin: proposal.verifyContext.verified.origin,
          chainIds,
          methods,
          response: "error",
        })
      }
      refreshSessions()
    } else {
      walletConnectInstance.rejectSession({
        id: proposal.id,
        reason: getSdkError("USER_REJECTED"),
      })
    }

    captureEvent({
      type: AnalyticsEventTypes.WalletConnectSessionProposal,
      origin: proposal.verifyContext.verified.origin,
      chainIds,
      methods,
      response: status === "accepted" ? "accepted" : "rejected",
    })
    closeWindowAfterWCRequestFullfilled()
  }

  const supportedMethods = new Map<
    string,
    "eip155" | "solana" | "bip122" | "eip5792"
  >()
  for (const method of Object.values(EIP155_SIGNING_METHODS)) {
    supportedMethods.set(method, "eip155")
  }
  for (const method of Object.values(SOLANA_SIGNING_METHODS)) {
    supportedMethods.set(method, "solana")
  }
  for (const method of Object.values(BIP122_SIGNING_METHODS)) {
    supportedMethods.set(method, "bip122")
  }
  for (const method of Object.values(EIP5792_METHODS)) {
    supportedMethods.set(method, "eip5792")
  }

  const onSessionRequest = async (
    requestEvent: SignClientTypes.EventArguments["session_request"],
  ) => {
    const { topic, params } = requestEvent
    const { request, chainId } = params

    let response: JsonRpcResponse<unknown> | undefined
    let responseStatus: "accepted" | "rejected" | "error" = "accepted"

    try {
      const type = supportedMethods.get(request.method)
      if (!type) {
        throw new Error(`The method ${request.method} is not supported`)
      }
      const status = await openWalletConnectDialog({
        type: "sessionRequest",
        acceptBtnText: "Approve",
        rejectBtnText: "Reject",
        sessionRequest: requestEvent,
      })
      if (status === "rejected") {
        responseStatus = "rejected"
        response = formatJsonRpcError(
          requestEvent.id,
          getSdkError("USER_REJECTED").message,
        )
        return
      }
      responseStatus = "accepted"
      switch (type) {
        case "eip5792":
          response = await approveEIP5792Request(requestEvent)
          break
        case "eip155":
          response = await approveEIP155Request(evmWalletWrapper, requestEvent)
          break
        case "solana": {
          const internalChainId = getInternalChainId(chainId)
          const chainProvider = getChainProvider(internalChainId)
          if (
            chainProvider.family === "SOLANA" ||
            chainProvider.family === "SOLANA_DEVNET"
          ) {
            const svmSigner = signer[chainProvider.family]
            if (svmSigner) {
              response = await approveSolanaRequest(svmSigner, requestEvent)
              break
            }
          }
          throw new Error(getSdkError("UNSUPPORTED_CHAINS").message)
        }
        case "bip122": {
          response = await approveBIP122Request(
            getSignerForBip122ChainId(chainId),
            requestEvent,
          )
          break
        }
      }
    } catch (error) {
      responseStatus = "error"
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred"
      openWalletConnectDialog({
        type: "error",
        errorText: errorMessage,
        acceptBtnText: "Ok",
      })
      response = formatJsonRpcError(requestEvent.id, errorMessage)
    } finally {
      if (response) {
        walletConnectInstance.respondSessionRequest({
          topic,
          response,
        })
      }

      captureEvent({
        type: AnalyticsEventTypes.WalletConnectSessionRequest,
        method: request.method,
        chainId,
        response: responseStatus,
      })
      closeWindowAfterWCRequestFullfilled()
    }
  }

  const getSignerForBip122ChainId = (chainId: string) => {
    switch (chainId) {
      case BIP122_MAINNET_CAIP2:
        return signer.BTC
      case BIP122_TESTNET_CAIP2:
        if (signer.BTC_TESTNET) {
          return signer.BTC_TESTNET
        }
        throw new Error("Testnet BTC signer not available")
      default:
        throw new Error(getSdkError("UNSUPPORTED_CHAINS").message)
    }
  }

  const onSessionAuthenticate = async (
    authRequest: SignClientTypes.EventArguments["session_authenticate"],
  ) => {
    const authPayload = populateAuthPayload({
      authPayload: authRequest?.params?.authPayload,
      chains: EIP155_CHAINS,
      methods: Object.values(EIP155_SIGNING_METHODS),
    })

    const address = evmWalletWrapper.address
    const messagesToSign: { message: string; iss: string }[] = []
    authPayload.chains.forEach((chain) => {
      const iss = `${chain}:${address}`
      const message = walletConnectInstance.engine.signClient.formatAuthMessage(
        {
          request: authPayload,
          iss,
        },
      )
      messagesToSign.push({
        message,
        iss,
      })
    })

    const status = await openWalletConnectDialog({
      type: "generic",
      title: "Session Authenticate",
      bodyText:
        messagesToSign.length > 1
          ? `${messagesToSign.length} chains`
          : messagesToSign[0].message,
      acceptBtnText: "Approve",
      rejectBtnText: "Reject",
    })
    if (status === "accepted") {
      const signedAuths = []
      for (const message of messagesToSign) {
        const signature = await evmWalletWrapper.signMessage(message.message)
        const signedCacao = buildAuthObject(
          authPayload,
          {
            t: "eip191",
            s: signature,
          },
          message.iss,
        )
        signedAuths.push(signedCacao)
      }
      await walletConnectInstance.engine.signClient.approveSessionAuthenticate({
        id: authRequest.id,
        auths: signedAuths,
      })

      refreshSessions()
    } else {
      await walletConnectInstance.engine.signClient.rejectSessionAuthenticate({
        id: authRequest.id,
        reason: getSdkError("USER_REJECTED"),
      })
    }
    captureEvent({
      type: AnalyticsEventTypes.WalletConnectSessionAuthenticate,
      response: status === "accepted" ? "accepted" : "rejected",
    })
    closeWindowAfterWCRequestFullfilled()
  }

  const closeWindowAfterWCRequestFullfilled = () => {
    if (getCloseAfterWCAction()) {
      if (window.opener && walletConnectInstance?.metadata) {
        window.opener.location.href = walletConnectInstance.metadata.url
      }
      window.close()
    }
  }

  const onPing = async () =>
    //requestEvent: SignClientTypes.EventArguments["session_ping"],
    {}

  const onDelete = async () =>
    //requestEvent: SignClientTypes.EventArguments["session_delete"],
    {
      refreshSessions()
      captureEvent({
        type: AnalyticsEventTypes.WalletConnectSessionDeleted,
      })
    }
  refreshSessions()
  captureEvent({
    type: AnalyticsEventTypes.WalletConnectSessionDeleted,
  })

  walletConnectInstance.on("session_proposal", onSessionProposal)
  walletConnectInstance.on("session_request", onSessionRequest)
  walletConnectInstance.on("session_authenticate", onSessionAuthenticate)
  walletConnectInstance.engine.signClient.events.on("session_ping", onPing)
  walletConnectInstance.on("session_delete", onDelete)

  return () => {
    walletConnectInstance.removeListener("session_proposal", onSessionProposal)
    walletConnectInstance.removeListener("session_request", onSessionRequest)
    walletConnectInstance.removeListener(
      "session_authenticate",
      onSessionAuthenticate,
    )
    walletConnectInstance.engine.signClient.events.removeListener(
      "session_ping",
      onPing,
    )
    walletConnectInstance.removeListener("session_delete", onDelete)
  }
}
