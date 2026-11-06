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
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import type { ISigner } from "@/login/types"
import { getCloseAfterWCAction } from "@/utils/reownAppKitWrapper"

import {
  BIP122_MAINNET_CAIP2,
  BIP122_SIGNING_METHODS,
  BIP122_TESTNET_CAIP2,
} from "../data/BIP122Data"
import { EIP155_CHAINS } from "../data/EIP155Data"
import { EIP5792_METHODS } from "../data/EIP5792Data"
import { SOLANA_SIGNING_METHODS } from "../data/SolanaData"
import { openWalletConnectDialog } from "../store/walletConnectDialogStore"
import { getInternalChainId } from "../utils/HelperUtils"
import {
  getEip155Methods,
  getSupportedNamespaces,
  isExternalWallet,
} from "../utils/supportedNamespaces"
import { WalletWrapper } from "../utils/WalletWrapper"
import { approveBIP122Request } from "./BIP122RequestHandlerUtil"
import { approveEIP155Request } from "./EIP155RequestHandlerUtil"
import { approveEIP5792Request } from "./EIP5792RequestHandlerUtil"
import { approveSolanaRequest } from "./SolanaRequestHandlerUtil"

export { getEip155Methods, getSupportedNamespaces, isExternalWallet }

export const setupListeners = (
  getSigner: () => ISigner,
  walletConnectInstance: WalletKit,
  refreshSessions: () => void,
) => {
  const onSessionProposal = async (
    proposal: SignClientTypes.EventArguments["session_proposal"],
  ) => {
    const signer = getSigner()
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
        const family = AVAILABLE_CHAINS.get(internalChainId)?.family
        return !!family && !!signer[family]
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
      const walletNote = isExternalWallet(signer)
        ? "Connected wallets support EVM networks only. "
        : ""
      openWalletConnectDialog({
        type: "error",
        errorText:
          supportedChains.length === 0
            ? `${walletNote}No supported chain found in request`
            : `${walletNote}Chains not supported: ${nonSupportedChains}`,
        acceptBtnText: "Ok",
      })
      captureEvent({
        type: AnalyticsEventTypes.WalletConnectSessionProposal,
        origin: proposal.verifyContext.verified.origin,
        chainIds,
        methods,
        response: "error",
      })
      // Reject the proposal so the dApp is not left pending until expiry.
      // Required namespaces that include unsupported chains are rejected with
      // UNSUPPORTED_CHAINS; unsupported optional namespaces are silently omitted
      // by buildApprovedNamespaces, so they never reach here.
      try {
        await walletConnectInstance.rejectSession({
          id: proposal.id,
          reason: getSdkError("UNSUPPORTED_CHAINS"),
        })
      } catch (error) {
        console.error("Failed to reject session proposal", error)
      }
      closeWindowAfterWCRequestFullfilled()
      return
    }

    const supportedNamespaces = getSupportedNamespaces(signer)
    const nonSupportedMethods: string[] = []

    for (const [nsKey, nsConfig] of Object.entries(
      proposal.params.requiredNamespaces ?? {},
    )) {
      const ns = nsKey.includes(":") ? nsKey.split(":")[0] : nsKey
      const supportedNs = supportedNamespaces[nsKey] ?? supportedNamespaces[ns]
      if (!supportedNs) {
        nonSupportedMethods.push(...(nsConfig.methods ?? []))
      } else {
        for (const method of nsConfig.methods ?? []) {
          if (!supportedNs.methods.includes(method)) {
            nonSupportedMethods.push(method)
          }
        }
      }
    }

    if (nonSupportedMethods.length > 0) {
      openWalletConnectDialog({
        type: "error",
        errorText: `Methods not supported: ${nonSupportedMethods.join(", ")}`,
        acceptBtnText: "Ok",
      })
      captureEvent({
        type: AnalyticsEventTypes.WalletConnectSessionProposal,
        origin: proposal.verifyContext.verified.origin,
        chainIds,
        methods,
        response: "error",
      })
      try {
        await walletConnectInstance.rejectSession({
          id: proposal.id,
          reason: getSdkError("UNSUPPORTED_METHODS"),
        })
      } catch (error) {
        console.error("Failed to reject session proposal", error)
      }
      closeWindowAfterWCRequestFullfilled()
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

  const getSupportedMethods = (signer: ISigner) => {
    const supportedMethods = new Map<
      string,
      "eip155" | "solana" | "bip122" | "eip5792"
    >()
    for (const method of getEip155Methods(signer)) {
      supportedMethods.set(method, "eip155")
    }
    for (const method of Object.values(SOLANA_SIGNING_METHODS)) {
      supportedMethods.set(method, "solana")
    }
    for (const method of Object.values(BIP122_SIGNING_METHODS)) {
      supportedMethods.set(method, "bip122")
    }
    if (!isExternalWallet(signer)) {
      for (const method of Object.values(EIP5792_METHODS)) {
        supportedMethods.set(method, "eip5792")
      }
    }
    return supportedMethods
  }

  const onSessionRequest = async (
    requestEvent: SignClientTypes.EventArguments["session_request"],
  ) => {
    const { topic, params } = requestEvent
    const { request, chainId } = params

    let response: JsonRpcResponse<unknown> | undefined
    let responseStatus: "accepted" | "rejected" | "error" = "accepted"

    try {
      const signer = getSigner()
      const type = getSupportedMethods(signer).get(request.method)
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
          response = await approveEIP155Request(
            new WalletWrapper(signer.EVM),
            requestEvent,
          )
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
            getSignerForBip122ChainId(signer, chainId),
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

  const getSignerForBip122ChainId = (signer: ISigner, chainId: string) => {
    switch (chainId) {
      case BIP122_MAINNET_CAIP2:
        if (signer.BTC) {
          return signer.BTC
        }
        throw new Error("BTC signer not available")
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
    const evmWalletWrapper = new WalletWrapper(getSigner().EVM)
    const authPayload = populateAuthPayload({
      authPayload: authRequest?.params?.authPayload,
      chains: EIP155_CHAINS,
      methods: getEip155Methods(getSigner()),
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
