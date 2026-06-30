"use client"

import React, { useState } from "react"
import Image from "next/image"
import type { Route } from "@lifi/sdk"
import { Button, Icon, Text } from "ui"

import { formatUnits } from "ethers-utils"
import { getChainName } from "@/chain/chains"
import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { useSelectedCurrency } from "@/stores/currencyStore"

import styles from "./RouteBox.module.css"

export const RouteBox = (props: {
  route: Route
  routeSelected?: boolean
  hideExpand?: boolean
  setSelectedRoute?: (route: Route) => void
}) => {
  const [expanded, setExpanded] = useState(props.hideExpand ?? false)
  const route = props.route
  const selectedCurrency = useSelectedCurrency()

  const totalFormattedTime = React.useMemo(() => {
    const totalSeconds = route.steps
      .map(({ estimate }) => estimate.executionDuration)
      .reduce((total, duration) => total + duration, 0)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (totalSeconds <= 0) {
      return "N/A"
    }
    return `${minutes ? `${minutes}m` : ""} ${seconds ? `${seconds}s` : ""}`
  }, [route.steps])

  const totalFee = React.useMemo(() => {
    return route.steps
      .flatMap((step) => step.estimate.feeCosts || [])
      .reduce((total, fee) => total + Number(fee.amountUSD), 0)
  }, [route.steps])

  if (!route) return null

  return (
    <div
      className={styles.routeBox}
      onClick={() => props.setSelectedRoute?.(route)}
      style={{
        borderColor: props.routeSelected
          ? "var(--brand-primary)"
          : "var(--border-dark)",
      }}
    >
      <div className={styles.boxHeader}>
        {route.tags?.includes("RECOMMENDED") ? (
          <Text style="14-600" color="brand">
            Recommended by LiFi{" "}
            <Icon name="BsCheckCircleFill" size="small" color="main" />
          </Text>
        ) : (
          <Text style="14-600">Alternative</Text>
        )}

        <span
          style={{ opacity: props.hideExpand ? 0 : 1, marginLeft: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="icon"
            icon={expanded ? "BsChevronUp" : "BsChevronDown"}
            onClick={() => setExpanded(!expanded)}
          />
        </span>
      </div>

      <div className={styles.symbolContainer}>
        <TokenLogo
          alt={route.toToken.symbol}
          address={route.toToken.address}
          chainId={route.toToken.chainId}
          showChainBadge={false}
        />

        <div className={styles.symbolBox}>
          <Text style="24-600">
            {formatTokenAmount(
              formatUnits(route.toAmount, route.toToken.decimals),
              route.toToken.symbol,
            )}
          </Text>

          <div style={{ display: "flex", gap: 4 }}>
            <Text style="12-400" color="text-secondary">
              {formatTokenValue(route.toAmountUSD, selectedCurrency)}
            </Text>
            <Text style="12-400" color="text-secondary">
              {route.toToken.symbol} on {getChainName(route.toToken.chainId)}
            </Text>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className={styles.expandedBox}>
          {route.steps.map((step) => (
            <div key={step.id} className={styles.hopBox}>
              <div className={styles.hopIcon}>
                {step.toolDetails.logoURI ? (
                  <Image
                    src={step.toolDetails.logoURI}
                    style={{ borderRadius: "50%" }}
                    unoptimized
                    alt={route.fromToken.symbol}
                    width={32}
                    height={0}
                  />
                ) : (
                  <Icon name="Questionmark" size="big" />
                )}
              </div>
              <div className={styles.hopDescription}>
                <Text style="12-400" color="text-secondary">
                  {getChainName(step.action.fromChainId)} via{" "}
                  {route.steps[0].toolDetails.name}
                </Text>
                <Text style="12-400" color="text-secondary">
                  {formatTokenAmount(
                    formatUnits(
                      step.estimate.fromAmount,
                      step.action.fromToken.decimals,
                    ),
                    step.action.fromToken.symbol,
                  )}
                  <Icon name="BsArrowRight" />
                  {formatTokenAmount(
                    formatUnits(
                      step.estimate.toAmount,
                      step.action.toToken.decimals,
                    ),
                    step.action.toToken.symbol,
                  )}
                </Text>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.boxFooter}>
        <div className={styles.footerItem}>
          <Icon name="BsFuelPump" color="white" />
          <Text style="14-600">
            {formatTokenValue(Number(route.gasCostUSD), selectedCurrency)}
          </Text>
        </div>
        <div className={styles.footerItem}>
          <Icon name="BsCashStack" color="white" />
          <Text style="14-600">
            {formatTokenValue(totalFee, selectedCurrency)}
          </Text>
        </div>
        <div className={styles.footerItem}>
          <Icon name="BsClock" color="white" />
          <Text style="14-600">{totalFormattedTime}</Text>
        </div>
      </div>
    </div>
  )
}
