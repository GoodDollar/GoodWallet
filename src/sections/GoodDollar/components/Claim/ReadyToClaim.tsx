import { useState } from "react"
import { Button, Drawer, Text } from "ui"

import { useTranslation } from "translations"
import { getChainName } from "@/chain/chains"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"

import styles from "./Claim.module.css"
import type { EligibleClaimWithGas } from "./ClaimView"

type ReadyToClaimProps = {
  claimableAmounts: EligibleClaimWithGas[]
}

export const ReadyToClaim = ({ claimableAmounts }: ReadyToClaimProps) => {
  const { translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  const claimableAmountSum = claimableAmounts.reduce(
    (acc, item) => acc + (item.sufficientGas ? item.amount : 0),
    0,
  )

  const claimableUbiAmounts = claimableAmounts.filter((c) => c.type === "ubi")
  const claimableRewardAmounts = claimableAmounts.filter(
    (c) => c.type === "welcome" || c.type === "invite",
  )
  const claimableInviteJoinAmounts = claimableAmounts.filter(
    (c) => c.type === "invite_join",
  )
  const hasReadyClaim =
    claimableAmountSum > 0 ||
    claimableInviteJoinAmounts.some((c) => c.sufficientGas)

  return (
    <>
      <div className={styles.readyToClaim}>
        <Text style="16-400" color="text-secondary" align="center">
          {hasReadyClaim
            ? goodDollarTranslations.readyToClaim
            : "Unable to claim"}
        </Text>

        <Text
          style="48-600"
          color={hasReadyClaim ? "white" : "text-secondary"}
          translate="no"
        >
          {claimableAmountSum > 0
            ? formatTokenAmount(claimableAmountSum, "G$")
            : claimableInviteJoinAmounts.some((c) => c.sufficientGas)
              ? "\u2014"
              : formatTokenAmount(claimableAmountSum, "G$")}
        </Text>

        <div className={styles.chainBreakdown}>
          <div className={styles.chainList}>
            {claimableUbiAmounts.map((item, index) => (
              <div key={index} className={styles.chainItem}>
                <Text
                  style="14-400"
                  color={item.sufficientGas ? "text-soft" : "text-secondary"}
                  className={!item.sufficientGas ? styles.strikethrough : ""}
                  translate="no"
                >
                  {formatTokenAmount(item.amount, "G$")}
                </Text>
                <Text style="14-400" color="text-secondary">
                  {getChainName(item.chainId)}
                </Text>

                {!item.sufficientGas && (
                  <Button
                    variant="icon"
                    icon="BsExclamationTriangleFill"
                    size="small"
                    color="red"
                    onClick={() => setDrawerOpen(true)}
                  />
                )}

                {index < claimableUbiAmounts.length - 1 && (
                  <Text style="14-400" color="text-secondary">
                    ·
                  </Text>
                )}
              </div>
            ))}
          </div>

          {claimableRewardAmounts.length > 0 && (
            <div className={styles.chainList}>
              {claimableRewardAmounts.map((item, index) => (
                <div key={index} className={styles.chainItem}>
                  {index === 0 && (
                    <Text style="14-400" color="text-secondary">
                      + Reward
                    </Text>
                  )}
                  <Text
                    style="14-400"
                    color={item.sufficientGas ? "text-soft" : "text-secondary"}
                    className={!item.sufficientGas ? styles.strikethrough : ""}
                    translate="no"
                  >
                    {formatTokenAmount(item.amount, "G$")}
                  </Text>
                  <Text style="14-400" color="text-secondary">
                    {getChainName(item.chainId)}
                  </Text>

                  {!item.sufficientGas && (
                    <Button
                      variant="icon"
                      icon="BsExclamationTriangleFill"
                      size="small"
                      color="red"
                      onClick={() => setDrawerOpen(true)}
                    />
                  )}

                  {index < claimableRewardAmounts.length - 1 && (
                    <Text style="14-400" color="text-secondary">
                      ·
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer open={isDrawerOpen} onClose={() => setDrawerOpen(false)}>
        <Text style="24-600" color="white">
          {goodDollarTranslations.insufficientGas.title}
        </Text>
        <Text style="14-400" color="text-secondary">
          {goodDollarTranslations.insufficientGas.bodyText}
        </Text>
      </Drawer>
    </>
  )
}
