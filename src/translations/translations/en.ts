import { MIN_TAKER_ORDER_IN_DOLLAR } from "@/sections/Predictions/constants/validation"

import type { TypedTranslations } from "../types"

const en: TypedTranslations = {
  predictions: {
    title: "Predictions",
    subtitle: "powered by Polymarket",
    markets: "Markets",
    openOrders: "Open Orders",
    positions: "Positions",
    marketTakerOrderFailedMiniumAmount: `Market buys must be greater than $${MIN_TAKER_ORDER_IN_DOLLAR}`,
    limitOrderFailedMiniumAmount: (minAmountShares: number) =>
      `Limit buys must be greater than ${minAmountShares} shares`,
    welcomeDialog: {
      title: "Welcome to Predictions",
      body: "Explore live market events and trade on their outcomes.\nTo get started, fund your Polymarket account.",
      acceptBtn: "Start Predicting",
    },
  },
  privacy: {
    bannerTitle: "Privacy Settings",
    mainDescription:
      "We use essential services, error tracking, and analytics tracking to provide the best experience. You can manage your preferences below.",
    customizeButtonLabel: "Customize",
    acceptAllButtonLabel: "Accept All",
    rejectAllButtonLabel: "Reject Non-Essential",
    customizeDescription:
      "Choose which services you want to enable. Essential services are always active.",
    essentialsLabel: "Essential Services",
    essentialsDescription:
      "Authentication, blockchain connectivity, and core wallet functionality. Always active.",
    errorTrackingLabel: "Error Tracking",
    errorTrackingDescription:
      "Tracks technical errors and crashes to improve app stability. No personal data collected.",
    analyticsTrackingLabel: "Analytics Tracking",
    analyticsTrackingDescription:
      "Tracks how you use the app to help us improve features. Includes wallet addresses.",
    backButtonLabel: "Back",
    saveButtonLabel: "Save My Preferences",
  },
  fund: {
    mainDisclaimer:
      "You will now be redirected to our trusted provider to complete your purchase securely.",
    continueButtonText: "Continue",
  },
  login: {
    signinText: "To start using your wallet please sign in",
    failedNotification: "Failed to login. Please try again",
    google: "Continue with Google",
    facebook: "Continue with Facebook",
    pwdless: "Continue via OTP code",
    legalText: {
      preText: "By signing in and entering, you're accepting our",
      terms: "Terms of use",
      midText: "and",
      privacy: "Privacy Policy",
    },
    dialog: {
      title: "Welcome to the New GoodWallet",
      body: "If you're using a previous version of GoodWallet, please make sure to login using the same authentication provider, marked in blue, and credentials to retreive your existing account.",
      acceptBtnText: "Accept",
    },
  },
  home: {
    pwaConfirmAlert: "A new version is available, refresh?",
    fund: "Fund",
    send: "Send",
    receive: "Receive",
    swap: "Swap",
    claim: "Claim",
    gooddollar: "GoodDollar",
    walletConnect: "WalletConnect",
    deposit: "Deposit",
    crypto: "Crypto",
    news: "News",
    activity: "Activity",
    allTokens: "All",
    predictions: "Predictions",
    more: "More",
    noTokens: {
      title: "No Tokens Yet",
      description:
        "Your list of tokens will appear here once you've added funds by claiming GoodDollar, receiving crypto, or buying crypto directly.",
    },
    noActivity: {
      title: "No Activity Yet",
      description:
        "After you send, receive, swap, or claim tokens, a complete history of your transactions will be displayed here.",
    },
  },
  gooddollar: {
    title: "GoodDollar",
    claim: "Claim",
    claimInitiated: (formattedAmount: string, chain: string) =>
      `Claiming ${formattedAmount} on ${chain}`,
    claimSucceeded: (formattedAmount: string, chain: string) =>
      `Claimed ${formattedAmount} on ${chain}`,
    claimFailed: (chain: string) => `Claiming of G$ on ${chain} failed`,
    whitelistRequired: "Whitelisting required",
    faceVerificationRequired:
      "Before you can start to claim your GoodDollars you first need to pass face verification to whitelist your account.",
    verify: "Verify",
    privacyDisclaimer:
      "We take your privacy seriously. We only store some particularities/relief data in our database, not the photo of your face itself.",
    learnMore: "Learn more.",
    readyToClaim: "Ready to claim",
    justALittleLonger: "Just a little longer...",
    moreG$Coming: "More G$ coming soon",
    today: "Today:",
    claimersReceived: "claimers received",
    outOf: "out of",
    available: "available",
    G$Stats: "More G$ Stats",
    welcomeRewardDialog: {
      title: "Welcome reward claimed",
      bodyText: "Congratulations! You have claimed your welcome reward.",
      acceptBtnText: "OK",
    },
    inviteRewardDialog: {
      title: "Invite reward claimed",
      bodyText: "Congratulations! You have claimed your invite reward.",
      acceptBtnText: "OK",
    },
    insufficientGas: {
      title: "Insufficient gas",
      bodyText:
        "You don't have enough gas to claim your GoodDollars. Please top up your wallet with gas and try again.",
    },
    news: "News",
    inviteRewards: "Invite Rewards",
    inviteJoinInClaimBreakdown: "Invite registration",
    inviteJoinClaimInitiated: (chain: string) =>
      `Completing invite on ${chain}`,
    inviteJoinClaimSucceeded: (chain: string) => `Invite completed on ${chain}`,
  },
  options: {
    title: "Options",
    evmAddress: "EVM Address",
    activityHistory: "Activity History",
    support: "Help & Documentation",
    logout: "Logout",
    copyPublic: "Copy Public Address",
    copyPrivate: "Copy Private Key",
    copiedPublicKey: "Public address copied",
    copiedPrivateKey: "Private key copied",
    inviteFriends: "Invite Friends",
    confirmation: "Confirmation",
    privateKeyExportDisclaimer:
      "You are about to export your private key which grants full access to your wallet and any held assets. You are responsible for keeping this secure.",
    legal: "Legal",
    welcomeReward: "Welcome Reward",
    gotoGW1: "Legacy GoodWallet",
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
  },
  receive: {
    title: "Receive",
    scan: "Scan code to receive funds",
    error: "An error occurred while fetching the address.",
  },
  send: {
    amount: "Amount",
    availableFunds: "available to send",
    cancelBtnLabel: "Cancel",
    clearBtnLabel: "Clear",
    closeBtnLabel: "Close",
    confirmBtnLabel: "Confirm",
    continueBtnLabel: "Continue",
    error: "Error",
    insufficientResourcesForNetworkCost: (unit, isEvm) =>
      `You don't have enough ${unit} to cover ${isEvm ? "gas" : "network fee"} costs`,
    lessThanMinimumAmount:
      "Amount is less than minimum sendable amount on network",
    max: "MAX",
    maxFeePerGas: "Max fee per gas",
    maxGasFee: "Max fee for transaction",
    noTokens: "No tokens available...",
    recent: "Recent",
    reviewTxBtnLabel: "Review Transaction",
    scanQrLabel: "Scan QR code",
    selectToken: "Select Token",
    sendDisclaimer:
      "Sending funds is a permanent action. For your security, be sure to own the wallet address listed.",
    sendFailure: "Failed to send",
    sending: "Sending",
    sendSuccess: "Succesfully sent",
    title: "Send",
    to: "To",
    toPlaceholder: {
      EVM: "Search, public address (0x), or ENS",
      BTC: "Public address bc1...",
      BTC_TESTNET: "Public address tb1...",
      DOGE: "Public address...",
      DOGE_TESTNET: "Public address...",
      SOLANA: "Public address...",
      SOLANA_DEVNET: "Public address...",
      XRP: "Public address...",
      XRP_TESTNET: "Public address...",
    },
    toPlaceholderGeneric: "Wallet address",
    totalCost: "Total cost",
  },
  invite: {
    title: "Invite Friends",
    reward: (amount: string) =>
      `Get a ${amount} reward every time a friend joins!`,
    inviteeReward: (amount: string) =>
      `(Your invitee will also receive ${amount} reward)`,
    how: "How it works",
    invite: "Your personal invite link",
    inviteCode: "Use invite code",
    inviteCodePlaceholder: "Place your invite code or link here",
    getReward: "Get Reward",
    totalRewards: "Total rewards earned",
    whoJoined: "Friends who joined",
    friendReminder:
      "Remind invited friends that they need to make their first G$ claim in order for you both to earn rewards",
    shareLink: "Share your personal invite link with your friends",
    ensureSignup: (minimumClaims: number) =>
      `Make sure they sign up and complete ${minimumClaims} claims`,
    daysEligibility: (minimumDays: number) =>
      `After ${minimumDays} days, the invite reward becomes available for them to claim`,
    rewardReceival: "When they claim it, both of you receive the reward",
    sponsoredBy: "Rewards pool is sponsored by",
    joined: "Joined",
    pending: "Pending",
    whitelistRequired:
      "You need to be whitelisted and claim to get an invite link.",
    joinToGetInviteLink:
      "Please join the GoodDollar community to get your invite link",
  },
  legal: {
    title: "Legal",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
  },
  welcomeReward: {
    header: "Welcome to the new GoodWallet!",
    eligibility: "You are eligible for",
    description: (formattedAmount: string) =>
      `${formattedAmount} will be sent to your wallet after you've claimed for the first time in the new GoodWallet!`,
    continueButton: "Continue",
  },
  swap: {
    tokenInformation: {
      token: "Token",
      chain: "Chain",
      marketCap: "Market Cap",
      volume: "Volume 24H",
      address: "Address",
      price: "Price",
    },
    firstTimeDialog: {
      title: "How swaps work",
      body: "You can swap over 10,000 tokens across multiple blockchains.\nMake sure you have enough gas on the selected chain.\nSome swaps may take a few minutes to complete.",
      acceptBtn: "I understand",
    },
    welcomeFlow: {
      title: "Get started with Predictions",
      subtitle:
        "To start trading on Polymarket, you need to sign and complete the following steps",
      createAccountStep: {
        title: "Create Account",
        subtitle: "Polymarket needs to authenticate your wallet",
      },
      deriveAccountStep: {
        title: "Existing account with Polymarket",
        subtitle: "Confirm to authenticate",
      },
      createSafeStep: {
        title: "Create Wallet",
        subtitle: "Polymarket requires a Safe wallet",
      },
      allowTokensStep: {
        title: "Allow Tokens",
        subtitle: "USDC.e coins are used in Polymarket",
      },
    },
    title: "Swap",
    searchPlaceholder: "Search token",
    selectBoxFromHeader: "From",
    selectBoxFromPlaceholder: "Select an origin token",
    selectBoxToHeader: "To",
    selectBoxToPlaceholder: "Select a destination token",
    amountInputBoxHeader: "You pay",
    amountInputBoxPlaceholder: "Please select an origin token",
    routesNoRoutesTag: "No routes available",
    routesReviewBtn: "Review",
    routesSearchingTag: "Searching for routes",
    routesSelectRouteTag: "Select a route",
    swapDialog: {
      title: "Review your transaction",
      acceptBtnText: "Swap",
      rejectBtnText: "Cancel",
    },
    swapNotification: {
      swapInitiated: (formattedFromAmount: string, toSymbol: string) =>
        `Swapping ${formattedFromAmount} to ${toSymbol}`,
      swapSucceeded: (formattedFromAmount: string, toSymbol: string) =>
        `Swapped ${formattedFromAmount} to ${toSymbol}`,
      swapFailed: (formattedFromAmount: string, toSymbol: string) =>
        `Failed to swap ${formattedFromAmount} to ${toSymbol}`,
      swapSlow:
        "This swap is taking longer than expected. Please check back in a few minutes.",
      userFriendlyErrors: {
        gasPrecheckFailed:
          "Insufficient balance for gas and value. Please try again.",
      },
    },
    errors: {
      originEqualsTarget: "Origin and target tokens are the same",
      invalidAmount: "Invalid amount",
      originChainNotSupported: "Origin chain not supported",
      targetChainNotSupported: "Target chain not supported",
      insufficientBalanceForGas: {
        title: "Insufficient balance for gas",
        text: "You don't have enough gas to complete the transaction. You need at least:",
        seperator: "on",
      },
    },
  },
  installApp: {
    clickShareIcon: "Click the share icon",
    addToHomeScreen: "and then Add to Home Screen",
    automatic: {
      title: "Install GoodWallet",
      bodyText:
        "For easy access to collecting your daily GoodDollars, press Ok to install it.",
    },
    manual: {
      title: "Remember to install or bookmark this page",
      bodyText:
        "For easy access to collecting your daily GoodDollars, remember to bookmark or add this shortcut to your home screen.",
    },
  },
  qrReader: {
    cameraAccessDeniedTitle: "Camera access denied!",
    cameraAccessDeniedBody:
      "Please allow this app to access your camera to scan QR codes. Then reload this page.",
  },
  walletConnect: {
    scanQrCode: "Scan QR Code",
    wcUriName: "WalletConnect URI",
    wcUriPlaceholder: "Enter WalletConnect URI",
    connectBtnText: "Connect",
    disconnectBtnText: "Disconnect",
    readyToConnectStatus: "Ready to connect",
    connectedStatus: "Connected",
    errorTitle: "Error",
  },
  onboarding: {
    slides: [
      {
        title: "Welcome to your new & improved GoodWallet!",
        description:
          "GoodWallet is your gateway to the world of cryptocurrencies. You can easily check out thousands of them and send and receive crypto with a few clicks.",
      },
      {
        title: "Swap crypto across currencies and networks",
        description:
          'Use the "Swap" button on the home screen to easily swap and bridge currencies within or across networks!',
      },
      {
        title: "One-click GoodDollar claims",
        description:
          "Use the Claim button on the home screen to claim from all chains with one click!",
      },
      {
        title: "And if you're an existing GoodWallet user...",
        description:
          "If you've used a previous version of GoodWallet, please make sure to login using the same authentication provider & credentials to retrieve your existing account.",
      },
    ],
  },
}
export default en
