"use client"

import type { PropsWithChildren, ReactElement } from "react"
import { Children, useMemo, useState } from "react"
import { Text } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

type TabsProps = PropsWithChildren<{
  activeTab?: string
}>

type TabProps = PropsWithChildren<{
  disabled?: boolean
}> &
  (
    | {
        tabPage: "home"
        tabId: "crypto" | "activity"
      }
    | {
        tabPage: "legal"
        tabId: "terms" | "privacy"
      }
    | {
        tabPage: "gooddollar"
        tabId: "claim" | "inviteRewards" | "news"
      }
    | {
        tabPage: "predictions"
        tabId: "markets" | "openOrders" | "positions"
      }
  )

const eventType = {
  crypto: AnalyticsEventTypes.CryptoTabSelected,
  activity: AnalyticsEventTypes.ActivityHistoryTabSelected,
  news: AnalyticsEventTypes.GoodDollarNewsTabSelected,
  terms: AnalyticsEventTypes.TermsOfUseTabSelected,
  privacy: AnalyticsEventTypes.PrivacyPolicyTabSelected,
  claim: AnalyticsEventTypes.GoodDollarClaimTabSelected,
  inviteRewards: AnalyticsEventTypes.GoodDollarInviteRewardsTabSelected,
  markets: AnalyticsEventTypes.PredictionsMarketsTabSelected,
  openOrders: AnalyticsEventTypes.PredictionsOpenOrdersTabSelected,
  positions: AnalyticsEventTypes.PredictionsPositionsTabSelected,
} as const

export const Tab = ({ children }: TabProps) => children

export const Tabs = ({ children, activeTab }: TabsProps) => {
  const { translations } = useTranslation()
  const { captureEvent } = useAnalytics()

  // Memoize children array conversion
  const tabs = useMemo(
    () => Children.toArray(children) as ReactElement<TabProps>[],
    [children],
  )

  const defaultTab = useMemo(
    () => tabs.find((tab) => tab.props.tabId === activeTab) || tabs[0],
    [tabs, activeTab],
  )
  const [activeTabId, setActiveTabId] = useState(defaultTab.props.tabId)
  const indexOfSelected = useMemo(
    () => tabs.findIndex((tab) => tab.props.tabId === activeTabId),
    [tabs, activeTabId],
  )
  const tabRatio = 100 / tabs.length

  const {
    legal: legalTranslations,
    home: homeTranslations,
    gooddollar: goodDollarTransalations,
    predictions: predictionsTranslations,
  } = translations

  const getLabelFromTabPage = (tab: ReactElement<TabProps>) => {
    const { tabPage, tabId } = tab.props
    switch (tabPage) {
      case "home":
        return homeTranslations[tabId]
      case "legal":
        return legalTranslations[tabId]
      case "gooddollar":
        return goodDollarTransalations[tabId]
      case "predictions":
        return predictionsTranslations[tabId]
      default:
        throw new Error("Unknown tab page")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        style={{
          width: "100vw",
          maxWidth: "var(--max-content-width)",
          transform: "translateX(-24px)",
          userSelect: "none",
          display: "flex",
          position: "relative",
        }}
      >
        {tabs.map((tab: ReactElement<TabProps>) => {
          const { disabled, tabId } = tab.props
          const label = getLabelFromTabPage(tab)
          // TODO: add pulsating CSS effect to this tab
          return (
            <button
              key={tabId}
              className="relative flex-1 py-2 flex justify-center items-center"
              onClick={(e) => {
                if (disabled) return
                if (activeTabId !== tabId) {
                  setActiveTabId(tabId)
                  captureEvent({ type: eventType[tabId] })
                }
                e.preventDefault()
              }}
            >
              <Text
                style="16-600"
                color={activeTabId === tabId ? "white" : "text-secondary"}
              >
                {label}
              </Text>
            </button>
          )
        })}
        <div
          className="absolute bottom-0 h-px"
          style={{
            backgroundColor: "rgba(33, 33, 33, 1)",
            width: "100%",
          }}
        />
        <div
          className="absolute bottom-0 h-px"
          style={{
            background: "var(--brand-gradient)",
            left: `${tabRatio * indexOfSelected}%`,
            width: `${tabRatio}%`,
            transition: "left 0.3s",
          }}
        />
      </div>
      <div className="flex-1 py-4">
        {tabs.find((tab) => tab.props.tabId === activeTabId)}
      </div>
    </div>
  )
}
