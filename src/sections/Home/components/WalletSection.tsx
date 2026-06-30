"use client"

import { type RefObject, useEffect, useRef } from "react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { useDebouncedEffect } from "@react-hookz/web"
import { setUser } from "@sentry/nextjs"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import {
  RoundButton,
  RoundButtonType,
} from "@/components/Form/RoundButton/RoundButton"
import { BottomSheet } from "@/components/Snippet/BottomSheet/BottomSheet"
import { useBottomSheetSnapshot } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { config } from "@/config"
import { claimUBIStore } from "@/gooddollar/stores/ubiStore"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSessionContext } from "@/login"
import { useDefaultLoginMethod } from "@/sections/Login/useDefaultLoginMethod"
import {
  INITIALIZE_WALLET_CONNECT_KEY,
  walletConnectState,
} from "@/sections/WalletConnect/store/walletConnectStore"
import { pwaVersionStore } from "@/stores/versioningStore"
import { isDeltaMobile, isPasskeyEnabled } from "@/utils/getClientEnvironment"
import { postMessageToReactNative } from "@/utils/messageReactNative"
import { isPwa } from "@/utils/pwa"

import { Menu } from "./Menu"
import { ProfileCard } from "./ProfileCard"
import styles from "./WalletSection.module.css"

export default function WalletSection({
  children,
}: {
  children: React.ReactNode
}) {
  const { locale, translations } = useTranslation()

  const homeTranslations = translations.home
  const {
    signer,
    addresses,
    sessionOrigin,
    authProvider,
    userName,
    profileImage,
  } = useSessionContext()

  const { setDefaultLoginMethod } = useDefaultLoginMethod()
  useEffect(
    () => setDefaultLoginMethod(authProvider),
    [authProvider, setDefaultLoginMethod],
  )

  const { tokens, balances, isValidating } = useTokenBalances()
  const { sessions, initializeWalletConnect } = useSnapshot(walletConnectState)

  const { title, subtitle, onBack } = useBottomSheetSnapshot()
  const isBottomSheetOpen = useSelectedLayoutSegment() === "(bottomsheet)"
  const { identifyUser, captureEvent, updateNetWorth } = useAnalytics()
  const onCloseBottomSheet = useRouteTransition(`/${locale}`)
  const versionSnap = useSnapshot(pwaVersionStore)

  const claimSnap = useSnapshot(claimUBIStore)
  const canClaim = Object.values(claimSnap).some(
    (claims) => claims.status === "can_claim",
  )

  useEffect(() => {
    if (versionSnap.remoteVersion) {
      const clientVersion = config.vercelConfig.commitSha
      if (clientVersion == undefined) {
        console.log("Client version not found")
        return
      }

      if (clientVersion !== pwaVersionStore.remoteVersion) {
        if (confirm(homeTranslations.pwaConfirmAlert)) {
          window.location.reload()
        }
      }
    }
  }, [versionSnap.remoteVersion, homeTranslations])

  useDebouncedEffect(
    () => {
      if (isValidating || !balances || !tokens) {
        return
      }
      updateNetWorth(balances, tokens)
    },
    [balances, tokens, isValidating, updateNetWorth],
    5000,
  )

  useEffect(() => {
    if (signer && addresses) {
      const evmAddress = addresses.get("EVM")
      if (!evmAddress) {
        throw new Error("Fatal! EVM address not found")
      }

      identifyUser(addresses)
      captureEvent({
        type: AnalyticsEventTypes.LoggedIn,
        sessionOrigin: sessionOrigin ?? "NA",
        authProvider: authProvider ?? "None",
        isDeltaMobile: isDeltaMobile(),
        isPasskeyEnabled: isPasskeyEnabled(),
        versionHash: config.vercelConfig.commitSha ?? "",
        isPwa: isPwa(),
      })
      if (
        config.walletConnectEnabled &&
        sessionStorage.getItem(INITIALIZE_WALLET_CONNECT_KEY) === "true"
      ) {
        initializeWalletConnect(signer)
      }

      setUser({ id: evmAddress })

      postMessageToReactNative({
        type: "LOGIN",
        addresses: Array.from(
          Array.from(addresses).map(([key, value]) => ({
            type: key,
            address: value,
          })),
        ),
        user: {
          username: evmAddress,
          profilePictureUrl: null,
        },
      })
    }
  }, [
    signer,
    addresses,
    authProvider,
    sessionOrigin,
    identifyUser,
    captureEvent,
    initializeWalletConnect,
  ])

  const dashboardRootDiv = useRef<HTMLDivElement>(null)
  useEffectScrollToTop(dashboardRootDiv, isBottomSheetOpen)

  const menuScrollRef = useRef(null)

  const sendLink = (
    <Link href={`/${locale}/send`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.Send}
        text={homeTranslations.send}
      />
    </Link>
  )

  const receiveLink = (
    <Link href={`/${locale}/receive`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.Receive}
        text={homeTranslations.receive}
      />
    </Link>
  )

  const swapLink = (
    <Link href={`/${locale}/swap`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.Swap}
        text={homeTranslations.swap}
      />
    </Link>
  )

  const predictionsLink = (
    <Link href={`/${locale}/predictions`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.Predictions}
        text={homeTranslations.predictions}
      />
    </Link>
  )

  const goodDollarLink = (
    <Link href={`/${locale}/gooddollar`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.GoodDollar}
        text={homeTranslations.gooddollar}
        fill={canClaim}
      />
    </Link>
  )

  const walletConnectLink = (
    <Link href={`/${locale}/walletconnect`} scroll={false} prefetch={true}>
      <RoundButton
        buttonType={RoundButtonType.WalletConnect}
        text={homeTranslations.walletConnect}
        fill={sessions.length > 0}
      />
    </Link>
  )

  return (
    <>
      <Menu />
      <Backdrop enable={isBottomSheetOpen} />
      <div
        ref={dashboardRootDiv}
        className={
          "w-full scroll-smooth" +
          (isBottomSheetOpen ? " pointer-events-none" : "")
        }
      >
        <div className="px-6 flex flex-col gap-6">
          <ProfileCard
            userName={userName}
            profileImage={profileImage}
            aggregatedUsdValue={balances?.aggregatedUsdValue}
            isLoadingValue={isValidating}
          />
          <div className={styles.buttonsContainer}>
            {goodDollarLink}
            {sendLink}
            {receiveLink}
            {swapLink}
            {predictionsLink}
            {walletConnectLink}
          </div>
          {/* ref scoll point where sticky menu appears */}
          <div ref={menuScrollRef} />
        </div>
      </div>

      {/* pop ups */}
      <BottomSheet
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        isOpen={isBottomSheetOpen}
        onClose={onCloseBottomSheet}
        className="z-[2]"
      >
        {children}
      </BottomSheet>
    </>
  )
}

const Backdrop = ({ enable }: { enable: boolean }) => {
  return (
    <div
      style={{
        width: "calc(100% - 1.5rem)",
        height: enable ? "100%" : "0",
      }}
      className={
        "z-[1] left-0 right-0 m-auto fixed transition opacity-0 ease-in-out duration-[300ms] z-4 rounded-xl " +
        (enable ? "opacity-100" : "")
      }
    ></div>
  )
}

const useEffectScrollToTop = (
  ref: RefObject<HTMLElement | null>,
  scroll: boolean,
) => {
  useEffect(() => {
    if (scroll) {
      ref.current?.scrollTo(0, 0)
    }
  }, [ref, scroll])
}
