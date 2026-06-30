import { MIN_TAKER_ORDER_IN_DOLLAR } from "@/sections/Predictions/constants/validation"

import type { TypedTranslations } from "../types"

const da: TypedTranslations = {
  predictions: {
    title: "Predictions",
    subtitle: "med Polymarket",
    markets: "Markeder",
    openOrders: "Åbne ordrer",
    positions: "Positioner",
    marketTakerOrderFailedMiniumAmount: `Markeds køb skal være større end $${MIN_TAKER_ORDER_IN_DOLLAR}`,
    limitOrderFailedMiniumAmount: (minAmountShares: number) =>
      `Limit køb skal være større end ${minAmountShares} aktier`,
    welcomeDialog: {
      title: "Velkommen til Predictions",
      body: "Udforsk markedsbegivenheder live og handle på deres udfald.\nFor at komme i gang, skal du fylde din Polymarket-konto op.",
      acceptBtn: "Start med at forudsige",
    },
  },
  privacy: {
    bannerTitle: "Privatlivsindstillinger",
    mainDescription:
      "Vi bruger essentielle tjenester, fejlsporing og analysesporing for at give den bedste oplevelse. Du kan administrere dine præferencer nedenfor.",
    customizeButtonLabel: "Tilpas",
    acceptAllButtonLabel: "Accepter alle",
    rejectAllButtonLabel: "Afvis ikke-essentielle",
    customizeDescription:
      "Vælg hvilke tjenester du vil aktivere. Essentielle tjenester er altid aktive.",
    essentialsLabel: "Essentielle tjenester",
    essentialsDescription:
      "Godkendelse, blockchain-forbindelse og grundlæggende wallet-funktionalitet. Altid aktiv.",
    errorTrackingLabel: "Fejlsporing",
    errorTrackingDescription:
      "Sporer tekniske fejl og nedbrud for at forbedre app-stabiliteten. Ingen personlige data indsamles.",
    analyticsTrackingLabel: "Analysesporing",
    analyticsTrackingDescription:
      "Sporer hvordan du bruger appen for at hjælpe os med at forbedre funktioner. Inkluderer wallet-adresser.",
    backButtonLabel: "Tilbage",
    saveButtonLabel: "Gem mine præferencer",
  },
  fund: {
    mainDisclaimer: "Du vil nu blive omdirigeret til vores betroede udbyder.",
    continueButtonText: "fortsæt",
  },
  login: {
    signinText: "Log ind for at benytte din GoodWallet",
    failedNotification: "Log ind fejlede. Prøv igen",
    google: "Fortsæt ved Google",
    facebook: "Fortsæt ved Facebook",
    pwdless: "Fortsæt via engangskode",
    legalText: {
      preText: "Ved at logge ind og fortsætte, accepterer du vores",
      terms: "Vilkår for brug",
      midText: "og",
      privacy: "Privatlivspolitik",
    },
    dialog: {
      title: "Velkommen til New GoodWallet",
      body: "Hvis du bruger en tidligere version af GoodWallet, skal du sørge for at logge ind med den samme godkendelsesudbyder, markeret med blå, og legitimationsoplysninger for at hente din eksisterende konto.",
      acceptBtnText: "OK",
    },
  },
  home: {
    pwaConfirmAlert: "En ny version er tilgængelig, opdater?",
    fund: "Fund",
    send: "Send",
    receive: "Modtag",
    swap: "Swap",
    claim: "Gør krav på",
    walletConnect: "WalletConnect",
    deposit: "Indbetal",
    crypto: "Krypto",
    news: "Nyheder",
    activity: "Aktivitet",
    allTokens: "Alle",
    gooddollar: "GoodDollar",
    predictions: "Prediktioner",
    noTokens: {
      title: "Ingen Tokens Endnu",
      description:
        "Din liste over tokens vil vises her, når du har tilføjet midler ved at kræve GoodDollar, modtage krypto, eller købe krypto direkte.",
    },
    noActivity: {
      title: "Ingen Aktivitet Endnu",
      description:
        "Efter du sender, modtager, bytter eller kræver tokens, vil en komplet historik over dine transaktioner blive vist her.",
    },
  },
  gooddollar: {
    title: "GoodDollar",
    claim: "Gør krav på",
    claimInitiated: (amount: string, chain: string) =>
      `Gør krav på ${amount} G$ på ${chain}`,
    claimSucceeded: (amount: string, chain: string) =>
      `Der blev gjort krav på ${amount} G$ på ${chain}`,
    claimFailed: (chain: string) =>
      `Der opstod en fejl ved gøre krav på på ${chain}`,
    whitelistRequired: "Whitelisting påkrævet",
    faceVerificationRequired:
      "Før du kan begynde at gøre krav på GoodDollars skal der opsættes godkendelse via ansigtsgenkendelse.",
    verify: "Godkend",
    privacyDisclaimer:
      "Vi tager dit privatliv alvorligt. Vi gemmer kun nogle udvalgte parametre i vores database, ikke selve billedet af dit ansigt.",
    learnMore: "Lær mere.",
    readyToClaim: "Klar til at gøre krav på",
    justALittleLonger: "Bare lidt længere...",
    moreG$Coming: "Flere G$ kommer snart",
    today: "I dag:",
    claimersReceived: "modtagere har gjort krav på",
    outOf: "ud af",
    available: "tilgængelig",
    G$Stats: "Flere G$ Statistikker",
    welcomeRewardDialog: {
      title: "Velkomst bonus indløst",
      bodyText: "Tillykke! Du har indløst din velkomst bonus.",
      acceptBtnText: "OK",
    },
    inviteRewardDialog: {
      title: "Invitations bonus indløst",
      bodyText: "Tillykke! Du har indløst din invitations bonus.",
      acceptBtnText: "OK",
    },
    insufficientGas: {
      title: "Utilstrækkelig gas",
      bodyText:
        "Du har ikke nok gas til at gøre krav på dine GoodDollars. Venligst fyld din wallet op med gas og prøv igen.",
    },
    news: "Nyheder",
    inviteRewards: "Invitationsbelønningers",
    inviteJoinInClaimBreakdown: "Invitationsregistrering",
    inviteJoinClaimInitiated: (chain: string) =>
      `Fuldfører invitation på ${chain}`,
    inviteJoinClaimSucceeded: (chain: string) =>
      `Invitation fuldført på ${chain}`,
  },
  options: {
    title: "Indstillinger",
    evmAddress: "EVM Adresser",
    activityHistory: "Aktivitetshistorik",
    support: "Hjælp og Dokumentation",
    logout: "Log ud",
    copyPublic: "Kopier offentlig adresse",
    copyPrivate: "Kopier privat adresse",
    copiedPublicKey: "Offentlig adresse kopieret",
    copiedPrivateKey: "Privat adresse kopieret",
    inviteFriends: "Inviter Venner",
    confirmation: "Bekræftelse",
    privateKeyExportDisclaimer:
      "Du er ved at eksportere din private nøgle, som giver fuld adgang til din wallet og alle dine aktiver. Du er ansvarlig for at holde den sikker.",
    legal: "Juridisk",
    welcomeReward: "Velkomstbelønning",
    gotoGW1: "Gammel GoodWallet",
    privacyPolicy: "Privatlivspolitik",
    termsOfUse: "Vilkår for brug",
  },
  receive: {
    title: "Modtag",
    scan: "Scan kode for at modtage midler",
    error: "Der opstod en fejl under hentning af adressen.",
  },
  send: {
    amount: "Beløb",
    availableFunds: "tilgængelig til at blive sendt",
    cancelBtnLabel: "Annuller",
    clearBtnLabel: "Ryd",
    closeBtnLabel: "Luk",
    confirmBtnLabel: "Bekræft",
    continueBtnLabel: "Fortsætte",
    error: "Fejl",
    insufficientResourcesForNetworkCost: (unit, isEvm) =>
      `Du har ikke nok ${unit} til at dække ${isEvm ? "gas " : "netværks"}omkostninger`,
    lessThanMinimumAmount:
      "Beløbet er mindre end det mindste sendbare beløb på netværket",
    max: "MAKS",
    maxFeePerGas: "Maks Omkostning Per Gas",
    maxGasFee: "Maks gebyr for transaktioner",
    noTokens: "Ingen tokens tilgængelige...",
    recent: "Seneste",
    reviewTxBtnLabel: "Gennemse Transaktion",
    scanQrLabel: "Scan QR kode",
    selectToken: "Vælg Token",
    sendDisclaimer:
      "At sende midler er en permanent handling. For din sikkerhed, sørg for at eje den anførte wallet adresse.",
    sendFailure: "Afsendelse mislykkedes",
    sending: "Sender",
    sendSuccess: "Afsendelse succesfuld",
    title: "Send",
    to: "Til",
    toPlaceholder: {
      EVM: "Søg, offentlig adresse (0x), eller ENS",
      BTC: "Offentlig addresse bc1...",
      BTC_TESTNET: "Offentlig addresse tb1...",
      DOGE: "Offentlig addresse...",
      DOGE_TESTNET: "Offentlig addresse...",
      SOLANA: "Offentlig addresse...",
      SOLANA_DEVNET: "Offentlig addresse...",
      XRP: "Offentlig addresse...",
      XRP_TESTNET: "Offentlig addresse...",
    },
    toPlaceholderGeneric: "Wallet addresse",
    totalCost: "Udgifter i alt",
  },
  invite: {
    title: "Inviter Venner",
    reward: (amount: string) =>
      `Få en belønning på ${amount} hver gang en ven tilmelder sig!`,
    inviteeReward: (amount: string) =>
      `(Den ven du inviterer vil også modtage en belønning på ${amount})`,
    how: "Hvordan det fungerer",
    invite: "Dit personlige invitationslink",
    inviteCode: "Benyt invitationskode",
    inviteCodePlaceholder: "Indsæt din invitationskode her",
    getReward: "Modtag Belønning",
    totalRewards: "Samlet belønning optjent",
    whoJoined: "Venner der har tilmeldt sig",
    friendReminder:
      "Mind inviterede venner om, at de skal gøre krav på deres G$ mindst én gang, for at I begge kan tjene jeres belønninger",
    shareLink: "Del dit personlige invitationslink med dine venner",
    ensureSignup: (minimumClaims: number) =>
      `Sørg for, at de tilmelder sig og gennemfører ${minimumClaims} krav`,
    daysEligibility: (minimumDays: number) =>
      `Efter ${minimumDays} dage bliver invitationsbelønningen tilgængelig for dem at gøre krav på`,
    rewardReceival: "Når de gør krav på den, modtager I begge belønningen",
    sponsoredBy: "Puljen af belønninger er sponsoreret af",
    joined: "Tilmeldt",
    pending: "Afventer",
    whitelistRequired:
      "Du skal være whitelisted og gøre krav på G$ for at få et invitationslink.",
    joinToGetInviteLink:
      "Tilmeld dig venligst GoodDollar fællesskabet for at få dit invitationslink",
  },
  legal: {
    title: "Juridisk",
    terms: "Vilkår",
    privacy: "Privatliv",
  },
  welcomeReward: {
    header: "Velkommen til den nye GoodWallet!",
    eligibility: "Du er berettiget til",
    description: (formattedAmount: string) =>
      `${formattedAmount} vil blive sendt til din wallet, efter du har "gjort krav på" for første gang i den nye GoodWallet!`,
    continueButton: "Fortsæt",
  },
  swap: {
    tokenInformation: {
      token: "Token",
      chain: "Kæde",
      marketCap: "Markedsværdi",
      volume: "Volumen 24T",
      address: "Adresse",
      price: "Pris",
    },
    welcomeFlow: {
      title: "Kom i gang med Prediktioner",
      subtitle:
        "For at begynde at handle på Polymarket skal du underskrive og gennemføre tre trin",
      createAccountStep: {
        title: "Opret konto",
        subtitle: "Polymarket skal godkende din wallet",
      },
      deriveAccountStep: {
        title: "Eksisterende konto med Polymarket",
        subtitle: "Bekræft for at godkende",
      },
      createSafeStep: {
        title: "Opret Wallet",
        subtitle: "Polymarket kræver en Safe wallet",
      },
      allowTokensStep: {
        title: "Tillad tokens",
        subtitle: "USDC.e mønter bruges i Polymarket",
      },
    },
    firstTimeDialog: {
      title: "Hvordan fungerer swaps",
      body: "Du kan swappe over 10.000 tokens på tværs af flere blockchains.\nSørg for, at du har nok gas på den valgte blockchain.\nNogle swaps kan tage et par minutter at gennemføre.",
      acceptBtn: "Jeg forstår",
    },
    title: "Swap",
    searchPlaceholder: "Søg token",
    selectBoxFromHeader: "Fra",
    selectBoxFromPlaceholder: "Vælg en oprindelig token",
    selectBoxToHeader: "Til",
    selectBoxToPlaceholder: "Vælg en destinations token",
    amountInputBoxHeader: "Du betaler",
    amountInputBoxPlaceholder: "Vælg venligst en oprindelig token",
    routesNoRoutesTag: "Ingen ruter tilgængelige",
    routesReviewBtn: "Gennemse",
    routesSearchingTag: "Søger efter ruter",
    routesSelectRouteTag: "Vælg en rute",
    swapDialog: {
      title: "Gennemse din transaktion",
      acceptBtnText: "Byt",
      rejectBtnText: "Annuller",
    },
    swapNotification: {
      swapInitiated: (formattedFromAmount: string, toSymbol: string) =>
        `Veksler ${formattedFromAmount} til ${toSymbol}`,
      swapSucceeded: (formattedFromAmount: string, toSymbol: string) =>
        `Vekslede ${formattedFromAmount} til ${toSymbol}`,
      swapFailed: (formattedFromAmount: string, toSymbol: string) =>
        `Fejlede at veksle ${formattedFromAmount} til ${toSymbol}`,
      swapSlow:
        "Handlingen tager længere tid end forventet. Prøv igen om et par minutter.",
      userFriendlyErrors: {
        gasPrecheckFailed:
          "Utilstrækkelig balance til gas og værdi. Prøv igen.",
      },
    },
    errors: {
      originEqualsTarget: "Til og fra tokens er de samme",
      invalidAmount: "Ugyldigt beløb",
      originChainNotSupported: "fra-chain ikke understøttet",
      targetChainNotSupported: "til-chain ikke understøttet",
      insufficientBalanceForGas: {
        title: "Utilstrækkelig balance til Gas",
        text: "Du har ikke nok gas til at gennemføre transaktionen. Du skal have mindst:",
        seperator: "på",
      },
    },
  },
  installApp: {
    clickShareIcon: "Klik på delingsikonet",
    addToHomeScreen: "og tilføj derefter til hjemmeskærmen",
    automatic: {
      title: "Installér GoodWallet",
      bodyText:
        "For nem adgang til at indsamle dine daglige GoodDollars, tryk ok for at installere. ",
    },
    manual: {
      title: "Husk at installere eller bogmærke denne side",
      bodyText:
        "For nem adgang til at indsamle dine daglige GoodDollars, husk at bogmærke eller tilføje en genvej på din hjemmeskærm.",
    },
  },
  qrReader: {
    cameraAccessDeniedTitle: "Adgang til kamera nægtet!",
    cameraAccessDeniedBody:
      "Venligst tillad denne app at få adgang til dit kamera, så du kan scanne QR-koder. Derefter skal du genindlæse denne side.",
  },
  walletConnect: {
    scanQrCode: "Scan QR-kode",
    wcUriName: "WalletConnect URI",
    wcUriPlaceholder: "Indsæt WalletConnect URI her",
    connectBtnText: "Forbind",
    disconnectBtnText: "Frakobl",
    readyToConnectStatus: "Klar til at forbinde",
    connectedStatus: "Forbundet",
    errorTitle: "Fejl",
  },
  onboarding: {
    slides: [
      {
        title: "Velkommen til din nye og forbedrede GoodWallet!",
        description:
          "GoodWallet er din gateway til verden af kryptovalutaer. Du kan nemt tjekke tusindvis af dem og sende og modtage krypto med et par klik.",
      },
      {
        title: "Byt krypto over valutaer og netværk",
        description:
          'Brug "Byt" knappen på startskærmen for at bytte og bro valutaer inden for eller på tværs af netværk!',
      },
      {
        title: "Et-klik GoodDollar krav",
        description:
          "Brug Krav knappen på startskærmen for at kræve fra alle kæder med et enkelt klik!",
      },
      {
        title: "Og hvis du er en eksisterende GoodWallet bruger...",
        description:
          "Hvis du har brugt en tidligere version af GoodWallet, skal du sørge for at logge ind med den samme godkendelsesudbyder og legitimationsoplysninger for at hente din eksisterende konto.",
      },
    ],
  },
}
export default da
