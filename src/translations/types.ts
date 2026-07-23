import type { ISigner } from "@/login"

export type LoginTranslations = {
  signinText: string
  failedNotification: string
  google: string
  facebook: string
  pwdless: string
  legalText: {
    preText: string
    terms: string
    midText: string
    privacy: string
  }
  dialog: {
    title: string
    body: string
    acceptBtnText: string
  }
}

export type PrivacyTranslations = {
  bannerTitle: string
  mainDescription: string
  customizeButtonLabel: string
  acceptAllButtonLabel: string
  rejectAllButtonLabel: string
  customizeDescription: string
  essentialsLabel: string
  essentialsDescription: string
  errorTrackingLabel: string
  errorTrackingDescription: string
  analyticsTrackingLabel: string
  analyticsTrackingDescription: string
  backButtonLabel: string
  saveButtonLabel: string
}

export type HomeTranslations = {
  fund: string
  send: string
  receive: string
  swap: string
  claim: string
  walletConnect: string
  deposit: string
  crypto: string
  news: string
  activity: string
  allTokens: string
  gooddollar: string
  pwaConfirmAlert: string
  predictions: string
  noTokens: {
    title: string
    description: string
  }
  noActivity: {
    title: string
    description: string
  }
}

export type GoodDollarTranslations = {
  title: string
  claim: string
  claimInitiated: (amount: string, chain: string) => string
  claimSucceeded: (amount: string, chain: string) => string
  claimFailed: (chain: string) => string
  whitelistRequired: string
  faceVerificationRequired: string
  verify: string
  privacyDisclaimer: string
  learnMore: string
  readyToClaim: string
  justALittleLonger: string
  moreG$Coming: string
  today: string
  claimersReceived: string
  outOf: string
  available: string
  G$Stats: string
  inviteRewardDialog: {
    title: string
    bodyText: string
    acceptBtnText: string
  }
  welcomeRewardDialog: {
    title: string
    bodyText: string
    acceptBtnText: string
  }
  insufficientGas: {
    title: string
    bodyText: string
  }
  news: string
  inviteRewards: string
  inviteJoinInClaimBreakdown: string
  inviteJoinClaimInitiated: (chain: string) => string
  inviteJoinClaimSucceeded: (chain: string) => string
}

export type OptionsTranslations = {
  title: string
  evmAddress: string
  activityHistory: string
  support: string
  logout: string
  copyPublic: string
  copyPrivate: string
  copyXrpSecretSeed: string
  copiedPublicKey: string
  copiedPrivateKey: string
  copiedXrpSecretSeed: string
  gotoGW1: string
  inviteFriends: string
  confirmation: string
  privateKeyExportDisclaimer: string
  xrpSecretSeedExportDisclaimer: string
  legal: string
  welcomeReward: string
  privacyPolicy: string
  termsOfUse: string
}

export type PredictionsTranslations = {
  title: string
  subtitle: string
  markets: string
  openOrders: string
  positions: string
  marketTakerOrderFailedMiniumAmount: string
  limitOrderFailedMiniumAmount: (minAmountShares: number) => string
  welcomeDialog: {
    title: string
    body: string
    acceptBtn: string
  }
}

export type ReceiveTranslations = {
  title: string
  scan: string
  error: string
}

export type SwapTranslations = {
  title: string
  searchPlaceholder: string
  selectBoxFromHeader: string
  selectBoxToHeader: string
  selectBoxFromPlaceholder: string
  selectBoxToPlaceholder: string
  amountInputBoxHeader: string
  amountInputBoxPlaceholder: string
  routesReviewBtn: string
  routesSearchingTag: string
  routesNoRoutesTag: string
  routesSelectRouteTag: string
  welcomeFlow: {
    title: string
    subtitle: string
    createAccountStep: {
      title: string
      subtitle: string
    }
    deriveAccountStep: {
      title: string
      subtitle: string
    }
    createSafeStep: {
      title: string
      subtitle: string
    }
    allowTokensStep: {
      title: string
      subtitle: string
    }
  }
  tokenInformation: {
    token: string
    chain: string
    marketCap: string
    volume: string
    address: string
    price: string
  }
  swapDialog: {
    title: string
    acceptBtnText: string
    rejectBtnText: string
  }
  swapNotification: {
    swapInitiated: (formattedFromAmount: string, toSymbol: string) => string
    swapSucceeded: (formattedFromAmount: string, toSymbol: string) => string
    swapFailed: (formattedFromAmount: string, toSymbol: string) => string
    swapSlow: string
    userFriendlyErrors: {
      gasPrecheckFailed: string
    }
  }
  firstTimeDialog: {
    title: string
    body: string
    acceptBtn: string
  }
  errors: {
    originEqualsTarget: string
    invalidAmount: string
    originChainNotSupported: string
    targetChainNotSupported: string
    insufficientBalanceForGas: {
      title: string
      text: string
      seperator: string
    }
  }
}

export type InstallAppTranslations = {
  manual: {
    title: string
    bodyText: string
  }
  automatic: {
    title: string
    bodyText: string
  }
  clickShareIcon: string
  addToHomeScreen: string
}

export type SendTranslations = {
  amount: string
  availableFunds: string
  cancelBtnLabel: string
  clearBtnLabel: string
  closeBtnLabel: string
  confirmBtnLabel: string
  continueBtnLabel: string
  error: string
  insufficientResourcesForNetworkCost: (unit: string, isEvm: boolean) => string
  lessThanMinimumAmount: string
  max: string
  maxFeePerGas: string
  maxGasFee: string
  noTokens: string
  recent: string
  reviewTxBtnLabel: string
  scanQrLabel: string
  selectToken: string
  sendDisclaimer: string
  sendFailure: string
  sending: string
  sendSuccess: string
  title: string
  to: string
  toPlaceholder: Record<keyof ISigner, string>
  toPlaceholderGeneric: string
  totalCost: string
}

export type InviteTranslations = {
  title: string
  reward: (amount: string) => string
  inviteeReward: (amount: string) => string
  how: string
  invite: string
  inviteCode: string
  inviteCodePlaceholder: string
  getReward: string
  totalRewards: string
  joinToGetInviteLink: string
  whoJoined: string
  friendReminder: string
  shareLink: string
  ensureSignup: (minimumClaims: number) => string
  daysEligibility: (minimumDays: number) => string
  rewardReceival: string
  sponsoredBy: string
  joined: string
  pending: string
  whitelistRequired: string
}

export type LegalTranslations = {
  title: string
  terms: string
  privacy: string
}

export type WelcomeRewardTranslations = {
  header: string
  eligibility: string
  description: (amount: string) => string
  continueButton: string
}

export type QrReaderTranslations = {
  cameraAccessDeniedTitle: string
  cameraAccessDeniedBody: string
}

export type WalletConnectTranslations = {
  scanQrCode: string
  wcUriName: string
  wcUriPlaceholder: string
  connectBtnText: string
  disconnectBtnText: string
  readyToConnectStatus: string
  connectedStatus: string
  errorTitle: string
}

export type DisclaimerWithLink = {
  text: string
  linkText: string
}

export type OnboardingTranslations = {
  slides: {
    title: string
    description: string
  }[]
}
export type FundTranslations = {
  mainDisclaimer: string
  continueButtonText: string
}

export type TypedTranslations = {
  fund: FundTranslations
  privacy: PrivacyTranslations
  login: LoginTranslations
  home: HomeTranslations
  gooddollar: GoodDollarTranslations
  options: OptionsTranslations
  predictions: PredictionsTranslations
  receive: ReceiveTranslations
  swap: SwapTranslations
  send: SendTranslations
  invite: InviteTranslations
  legal: LegalTranslations
  welcomeReward: WelcomeRewardTranslations
  installApp: InstallAppTranslations
  qrReader: QrReaderTranslations
  walletConnect: WalletConnectTranslations
  onboarding: OnboardingTranslations
}
