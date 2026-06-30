import { useCallback } from "react"
import { Text } from "ui"

import { useTranslation } from "translations"

import styles from "./Claim.module.css"
import Countdown from "./Countdown"

type ClaimButtonProps = {
  hasClaims: boolean
  claimsOutOfGas: boolean
  nextClaimDate?: Date
  onClaim: () => void
}

export const ClaimButton = ({
  hasClaims,
  claimsOutOfGas,
  nextClaimDate,
  onClaim,
}: ClaimButtonProps) => {
  const { translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar

  const handleClaim = useCallback(() => {
    if (hasClaims) {
      onClaim()
    }
  }, [onClaim, hasClaims])

  const claimGradientStyle =
    hasClaims && !claimsOutOfGas
      ? { background: "var(--brand-gradient)" }
      : { background: "rgb(75, 85, 99)" }

  return (
    <button
      className={styles.claimButton}
      onClick={handleClaim}
      disabled={claimsOutOfGas}
    >
      <div className={styles.claimButtonGlow} style={claimGradientStyle} />
      <div className={styles.claimButtonRing}>
        <div
          className={styles.claimButtonGradient}
          style={claimGradientStyle}
        />
        <div className={styles.claimButtonInner} />
      </div>
      <div className={styles.claimButtonText}>
        {hasClaims ? (
          <Text
            style="24-600"
            className={
              claimsOutOfGas ? styles.textDisabled : styles.textGradient
            }
          >
            {goodDollarTranslations.claim}
          </Text>
        ) : (
          <Text style="20-600" className={styles.textCountdown}>
            <Countdown nextClaim={nextClaimDate ?? new Date()} />
          </Text>
        )}
      </div>
    </button>
  )
}
