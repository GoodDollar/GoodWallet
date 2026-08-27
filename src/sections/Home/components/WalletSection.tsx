"use client"

import { type RefObject, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { useDebouncedEffect } from "@react-hookz/web"
import { setUser } from "@sentry/nextjs"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { RoundButton } from "@/components/Form/RoundButton/RoundButton"
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
import {
  coreDashboardActions,
  type DashboardAction,
  widgetDashboardActions,
} from "@/widgets/registry"

import { Menu } from "./Menu"
import { ProfileCard } from "./ProfileCard"
import styles from "./WalletSection.module.css"

// Widget dashboard buttons that should report a click. Core actions
// (Send/Receive/Swap/...) are intentionally excluded - they only track
// action completion, not the click itself.
type WidgetTabSelectedEventType =
  | AnalyticsEventTypes.AICreditsTabSelected
  | AnalyticsEventTypes.GoodReserveTabSelected
  | AnalyticsEventTypes.SuperfluidCampaignTabSelected

const widgetActionEventType: Record<string, WidgetTabSelectedEventType> = {
  "goodwidget.ai-credits": AnalyticsEventTypes.AICreditsTabSelected,
  "goodwidget.goodreserve": AnalyticsEventTypes.GoodReserveTabSelected,
  "goodwidget.superfluid-campaign":
    AnalyticsEventTypes.SuperfluidCampaignTabSelected,
}

export default function WalletSection({
  children,
}: {
  children: React.ReactNode
}) {
  const { locale, translations } = useTranslation()
  const [isActionsCollapsed, setIsActionsCollapsed] = useState(false)
  const [hasMultipleActionRows, setHasMultipleActionRows] = useState(false)
  const [actionRowHeight, setActionRowHeight] = useState(0)

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
    const remoteVersion = versionSnap.remoteVersion
    if (!remoteVersion) return

    const clientVersion = config.vercelConfig.commitSha
    if (!clientVersion || clientVersion === remoteVersion) return
    if (sessionStorage.getItem("pwa-dismissed-version") === remoteVersion) {
      return
    }

    if (confirm(homeTranslations.pwaConfirmAlert)) {
      const updateUrl = new URL(window.location.href)
      updateUrl.searchParams.set("_goodwallet_update", Date.now().toString())
      window.location.replace(updateUrl)
    } else {
      sessionStorage.setItem("pwa-dismissed-version", remoteVersion)
    }
  }, [versionSnap.remoteVersion, homeTranslations.pwaConfirmAlert])

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
  const actionButtonsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const actionButtons = actionButtonsRef.current
    if (!actionButtons) return

    const updateActionRows = () => {
      const buttons = Array.from(actionButtons.children) as HTMLElement[]
      const firstButton = buttons[0]
      if (!firstButton) return

      setActionRowHeight(firstButton.offsetHeight)
      setHasMultipleActionRows(
        buttons.some((button) => button.offsetTop !== firstButton.offsetTop),
      )
    }

    updateActionRows()
    const resizeObserver = new ResizeObserver(updateActionRows)
    resizeObserver.observe(actionButtons)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!hasMultipleActionRows) {
      setIsActionsCollapsed(false)
    }
  }, [hasMultipleActionRows])

  const actionLabels: Record<string, string> = {
    gooddollar: homeTranslations.gooddollar,
    send: homeTranslations.send,
    receive: homeTranslations.receive,
    swap: homeTranslations.swap,
    walletconnect: homeTranslations.walletConnect,
  }
  const dashboardActions: readonly DashboardAction[] = [
    ...coreDashboardActions,
    ...widgetDashboardActions,
  ]

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
            aggregatedUsdValue={
              config.playwrightTestMode
                ? "124.68"
                : balances?.aggregatedUsdValue
            }
            isLoadingValue={config.playwrightTestMode ? false : isValidating}
          />
          <div
            ref={actionButtonsRef}
            className={styles.buttonsContainer}
            style={
              isActionsCollapsed ? { maxHeight: actionRowHeight } : undefined
            }
            data-testid="wallet-actions"
          >
            {dashboardActions.map((action) => {
              const icon =
                action.icon.kind === "system" ? action.icon.name : undefined
              const iconElement =
                action.icon.kind === "local" ? action.icon.render() : undefined
              const indicator =
                action.id === "gooddollar" && canClaim
                  ? "available"
                  : action.id === "walletconnect" && sessions.length > 0
                    ? "connected"
                    : undefined
              const widgetEventType = action.widgetId
                ? widgetActionEventType[action.widgetId]
                : undefined

              return (
                <Link
                  key={action.id}
                  href={`/${locale}/${action.routeSlug}`}
                  scroll={false}
                  prefetch={true}
                  onClick={
                    widgetEventType
                      ? () => captureEvent({ type: widgetEventType })
                      : undefined
                  }
                >
                  <RoundButton
                    icon={icon}
                    iconElement={iconElement}
                    text={actionLabels[action.id] ?? action.label}
                    indicator={indicator}
                  />
                </Link>
              )
            })}
          </div>
          {hasMultipleActionRows ? (
            <div
              className={styles.actionsToggle}
              data-testid="wallet-actions-toggle"
            >
              <Button
                variant="icon"
                icon={isActionsCollapsed ? "BsChevronDown" : "BsChevronUp"}
                onClick={() => setIsActionsCollapsed((prev) => !prev)}
              />
            </div>
          ) : null}
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
