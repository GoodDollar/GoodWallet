import type { ISigner } from "@/login/types"

export enum AnalyticsEventTypes {
  LoggedIn = "LoggedIn",
  LoggedOut = "LoggedOut",
  ReturnToDelta = "Return_To_Delta",
  CryptoTabSelected = "Crypto_Tab_Selected",
  ActivityHistoryTabSelected = "ActivityHistory_Tab_Selected",
  TermsOfUseTabSelected = "TermsOfUse_Tab_Selected",
  PrivacyPolicyTabSelected = "PrivacyPolicy_Tab_Selected",
  GoodDollarClaimSucceeded = "GoodDollar_Claim_Succeeded",
  GoodDollarClaimFailed = "GoodDollar_Claim_Failed",
  GoodDollarWhiteListTriggered = "GoodDollar_WhiteList_Triggered",
  GoodDollarWhitelistSynced = "GoodDollar_Whitelist_Synced",
  GoodDollarOneTimeRewardClaimSucceeded = "GoodDollar_One_Time_Reward_Claim_Succeeded",
  GoodDollarOneTimeRewardClaimFailed = "GoodDollar_One_Time_Reward_Claim_Failed",
  GoodDollarFaucetSucceeded = "GoodDollar_Faucet_Succeeded",
  GoodDollarFaucetFailed = "GoodDollar_Faucet_Failed",
  GoodDollarInviteRewardClaimSucceeded = "GoodDollar_Invite_Reward_Claim_Succeeded",
  GoodDollarInviteRewardClaimFailed = "GoodDollar_Invite_Reward_Claim_Failed",
  GoodDollarInviteJoinSucceeded = "GoodDollar_Invite_Reward_Join_Succeeded",
  GoodDollarInviteJoinFailed = "GoodDollar_Invite_Reward_Join_Failed",
  SendSucceeded = "Send_Succeeded",
  SendFailed = "Send_Failed",
  ReceiveQRCodeScanned = "Receive_QRCode_Scanned",
  ActivityHistoryFilter = "ActivityHistory_Filter",
  ActivityHistoryExpand = "ActivityHistory_Expand",
  NewsItemClicked = "News_Item_Clicked",
  PrivateKeyCopied = "PrivateKey_Copied",
  PublicKeyCopied = "PublicKey_Copied",
  AppInstalled = "App_Installed",
  WalletConnectSessionProposal = "WalletConnect_Session_Proposal",
  WalletConnectSessionRequest = "WalletConnect_Session_Request",
  WalletConnectSessionAuthenticate = "WalletConnect_Session_Authenticate",
  WalletConnectSessionDeleted = "WalletConnect_Session_Deleted",
  SwapSucceeded = "Swap_Succeeded",
  SwapFailed = "Swap_Failed",
  SwapPrecheckFailed = "Swap_Precheck_Failed",
  GotoOldGoodWallet = "Goto_Old_GoodWallet",
  GotoHelp = "Goto_Help",
  TorusLoginFailed = "Torus_Login_Failed",
  TokenBalanceError = "Token_Balance_Error",
  CurrencySelected = "Currency_Selected",
  TokensCacheUpdated = "Tokens_Cache_Update",
  TokensSavedPerChain = "Tokens_Saved_Per_Chain_LiFi",
  GoodDollarClaimTabSelected = "GoodDollar_Claim_Tab_Selected",
  GoodDollarInviteRewardsTabSelected = "GoodDollar_Invite_Rewards_Tab_Selected",
  GoodDollarNewsTabSelected = "GoodDollar_News_Tab_Selected",
  WalletSignedMessageConfirmed = "Wallet_Message_Signed_Confirmed",
  WalletSignedMessageCancelled = "Wallet_Message_Signed_Cancelled",
  PolymarketAuthenticationSucceeded = "Polymarket_Authentication_Succeeded",
  PolymarketAuthenticationFailed = "Polymarket_Authentication_Failed",
  PolymarketSafeDeploymentSucceeded = "Polymarket_Safe_Deployment_Succeeded",
  PolymarketSafeDeploymentFailed = "Polymarket_Safe_Deployment_Failed",
  PolymarketAllowTokensSucceeded = "Polymarket_Allow_Tokens_Succeeded",
  PolymarketAllowTokensFailed = "Polymarket_Allow_Tokens_Failed",
  PolymarketOrderPlacementSucceeded = "Polymarket_Order_Placement_Succeeded",
  PolymarketOrderPlacementFailed = "Polymarket_Order_Placement_Failed",
  PolymarketWalletFunded = "Polymarket_Wallet_Funded",
  PolymarketWithdraw = "Polymarket_Withdraw",
  PolymarketWithdrawFailed = "Polymarket_Withdraw_Failed",
  PolymarketRedeemPositionSucceeded = "Polymarket_Redeem_Position_Succeeded",
  PolymarketRedeemPositionFailed = "Polymarket_Redeem_Position_Failed",
  PredictionsMarketsTabSelected = "Predictions_Markets_Tab_Selected",
  PredictionsOpenOrdersTabSelected = "Predictions_Open_Orders_Tab_Selected",
  PredictionsPositionsTabSelected = "Predictions_Positions_Tab_Selected",
}

export enum AvailableMethodsNames {
  SignTransaction = "SignTransaction",
  SignTransactions = "SignTransactions",
  SignMessage = "SignMessage",
  SignTypedData = "SignTypedData",
  Sign = "Sign",
  SignPsbt = "SignPsbt",
  SignMessages = "SignMessages",
}
export type AvailableMethods =
  (typeof AvailableMethodsNames)[keyof typeof AvailableMethodsNames]

export type AnalyticsEvent =
  | {
      type: AnalyticsEventTypes.LoggedIn
      authProvider: string
      sessionOrigin: string
      isDeltaMobile: boolean
      isPasskeyEnabled: boolean
      versionHash: string
      isPwa: boolean
    }
  | {
      type: AnalyticsEventTypes.LoggedOut
    }
  | {
      type: AnalyticsEventTypes.ReturnToDelta
    }
  | {
      type: AnalyticsEventTypes.CryptoTabSelected
    }
  | {
      type: AnalyticsEventTypes.ActivityHistoryTabSelected
    }
  | {
      type: AnalyticsEventTypes.GoodDollarNewsTabSelected
    }
  | {
      type: AnalyticsEventTypes.GoodDollarClaimSucceeded
      subType: "ubi" | "invite" | "welcome" | "invite_join"
      chainId: number
      amount: number
      usdAmount: number
    }
  | {
      type: AnalyticsEventTypes.GoodDollarClaimFailed
      subType: "ubi" | "invite" | "welcome" | "invite_join"
      chainId: number
      error: string
    }
  | {
      type: AnalyticsEventTypes.GoodDollarWhiteListTriggered
    }
  | {
      type: AnalyticsEventTypes.GoodDollarWhitelistSynced
      address: string
    }
  | {
      type: AnalyticsEventTypes.GoodDollarInviteJoinSucceeded
      chainId: number
      rewardAmount: number
    }
  | {
      type: AnalyticsEventTypes.GoodDollarInviteJoinFailed
      chainId: number
      reason: string
    }
  | {
      type: AnalyticsEventTypes.SendSucceeded
      chainId: number
      symbol: string
      amount: number
      usdAmount: number
      tokenAddress: string
    }
  | {
      type: AnalyticsEventTypes.SendFailed
      chainId: number
      symbol: string
      amount: number
      tokenAddress: string
    }
  | {
      type: AnalyticsEventTypes.ReceiveQRCodeScanned
      data: string
    }
  | {
      type: AnalyticsEventTypes.ActivityHistoryFilter
      chainId: number
    }
  | {
      type: AnalyticsEventTypes.ActivityHistoryExpand
      txHash: string
    }
  | {
      type: AnalyticsEventTypes.NewsItemClicked
      url: string
    }
  | {
      type: AnalyticsEventTypes.PrivateKeyCopied
    }
  | {
      type: AnalyticsEventTypes.PublicKeyCopied
      family: keyof ISigner
    }
  | {
      type: AnalyticsEventTypes.TermsOfUseTabSelected
    }
  | {
      type: AnalyticsEventTypes.PrivacyPolicyTabSelected
    }
  | {
      type: AnalyticsEventTypes.AppInstalled
    }
  | {
      type: AnalyticsEventTypes.GoodDollarFaucetSucceeded
      subType: "topped_via_contract" | "topped_via_api"
      chainId: number
    }
  | {
      type: AnalyticsEventTypes.GoodDollarFaucetFailed
      chainId: number
    }
  | {
      type: AnalyticsEventTypes.WalletConnectSessionProposal
      origin: string
      chainIds: string[]
      methods: string[]
      response: "accepted" | "rejected" | "error"
    }
  | {
      type: AnalyticsEventTypes.WalletConnectSessionRequest
      method: string
      chainId: string
      response: "accepted" | "rejected" | "error"
    }
  | {
      type: AnalyticsEventTypes.WalletConnectSessionAuthenticate
      response: "accepted" | "rejected"
    }
  | {
      type: AnalyticsEventTypes.WalletConnectSessionDeleted
    }
  | {
      type: AnalyticsEventTypes.SwapSucceeded
      fromChainId: number
      toChainId: number
      fromTokenSymbol: string
      toTokenSymbol: string
      amount: string
      usdAmount: number
    }
  | {
      type: AnalyticsEventTypes.SwapFailed
      fromChainId: number
      toChainId: number
      fromTokenSymbol: string
      toTokenSymbol: string
      amount: string
      reason: string
    }
  | {
      type: AnalyticsEventTypes.SwapPrecheckFailed
      chainId: number
      requiredBalance: string
      availableBalance: string
      txSerialized: string
    }
  | {
      type: AnalyticsEventTypes.GotoOldGoodWallet
    }
  | {
      type: AnalyticsEventTypes.GotoHelp
      url: string
    }
  | {
      type: AnalyticsEventTypes.TorusLoginFailed
    }
  | {
      type: AnalyticsEventTypes.TokenBalanceError
      chainId: number
      reason: string
    }
  | {
      type: AnalyticsEventTypes.CurrencySelected
      currency: string
      previousCurrency: string
    }
  | {
      type: AnalyticsEventTypes.TokensCacheUpdated
    }
  | {
      type: AnalyticsEventTypes.TokensSavedPerChain
      amountOfTokens: number
    }
  | {
      type: AnalyticsEventTypes.GoodDollarClaimTabSelected
    }
  | {
      type: AnalyticsEventTypes.GoodDollarInviteRewardsTabSelected
    }
  | {
      type: AnalyticsEventTypes.WalletSignedMessageConfirmed
      chainName: string
      methodName: AvailableMethods
    }
  | {
      type: AnalyticsEventTypes.WalletSignedMessageCancelled
      chainName: string
      methodName: AvailableMethods
    }
  | {
      type: AnalyticsEventTypes.PolymarketAuthenticationSucceeded
    }
  | {
      type: AnalyticsEventTypes.PolymarketAuthenticationFailed
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketSafeDeploymentSucceeded
      safeAddress: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketSafeDeploymentFailed
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketAllowTokensSucceeded
    }
  | {
      type: AnalyticsEventTypes.PolymarketAllowTokensFailed
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketOrderPlacementSucceeded
      orderType: "market" | "limit"
      size: number
      priceUsdce: number
      totalCostUsdce: number
      side: "BUY" | "SELL"
      tokenId: string
      marketTitle: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketOrderPlacementFailed
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketWalletFunded
      usdceAmount: number
    }
  | {
      type: AnalyticsEventTypes.PolymarketWithdraw
      usdceAmount: number
    }
  | {
      type: AnalyticsEventTypes.PolymarketWithdrawFailed
      usdceAmount: number
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketRedeemPositionSucceeded
      conditionId: string
    }
  | {
      type: AnalyticsEventTypes.PolymarketRedeemPositionFailed
      errorReason: string
    }
  | {
      type: AnalyticsEventTypes.PredictionsMarketsTabSelected
    }
  | {
      type: AnalyticsEventTypes.PredictionsOpenOrdersTabSelected
    }
  | {
      type: AnalyticsEventTypes.PredictionsPositionsTabSelected
    }
