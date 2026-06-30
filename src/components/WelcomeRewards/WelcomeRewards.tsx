"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { GoodDollarRain, GoodDollarStack } from "ui"

import { useTranslation } from "translations"
import { useSessionContext } from "@/login"

import { formatTokenAmount } from "../Utils/tokenFormat"
import styles from "./styles.module.css"

type WelcomeRewardsProps = {
  rewardAmount: number
}

export default function WelcomeRewards({ rewardAmount }: WelcomeRewardsProps) {
  const { locale, translations } = useTranslation()
  const { signer } = useSessionContext()

  const { welcomeReward } = translations
  const formattedAmount = formatTokenAmount(rewardAmount, "G$")

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  return (
    <div className={styles.rewardsContainer}>
      <h1 className={styles.rewardsTitle}>{welcomeReward.header}</h1>

      <div className={styles.rewardsImgRainContainer}>
        <Image
          className={styles.rewardsImgRain}
          width={350}
          src={GoodDollarRain}
          alt="welcome-reward"
        />
      </div>
      <div className={styles.rewardsImgBox}>
        <Image width={150} src={GoodDollarStack} alt="welcome-reward" />

        <div className={styles.rewardsValueInfoBox}>
          <p className={styles.rewardsValueInfo}>{welcomeReward.eligibility}</p>
          <h2 className={styles.rewardsValue}>{formattedAmount}</h2>
        </div>
      </div>

      <div className={styles.rewardsTextBox}>
        <p className={styles.rewardsText}>
          {welcomeReward.description(formattedAmount)}{" "}
        </p>
        <div className={styles.rewardsBtnBox}>
          <Link
            href={`/${locale}/${signer ? "gooddollar" : ""}`}
            className={styles.rewardsBtn}
          >
            {welcomeReward.continueButton}
          </Link>
        </div>
      </div>
    </div>
  )
}
