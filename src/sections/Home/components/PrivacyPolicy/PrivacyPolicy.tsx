"use client"

import { useEffect, useState } from "react"
import { Button, Text } from "ui"
import { useSnapshot } from "valtio"

import { Switch } from "@/components/Switch/Switch"
import { trackingPreferences } from "@/stores/trackingPreferencesStore"
import { useTranslation } from "@/translations"

import styles from "./PrivacyPolicy.module.css"

const PrivacyPolicy = () => {
  const [view, setView] = useState<"main" | "customize">("main")
  const [showBanner, setShowBanner] = useState(false)
  const { translations } = useTranslation()

  const [customErrorTracking, setCustomErrorTracking] = useState(true)
  const [customAnalyticsTracking, setCustomAnalyticsTracking] = useState(true)

  const trackingPreferenceSnapshot = useSnapshot(trackingPreferences)

  useEffect(() => {
    setShowBanner(
      trackingPreferenceSnapshot.Sentry === "unknown" ||
        trackingPreferenceSnapshot.Amplitude === "unknown",
    )
  }, [trackingPreferenceSnapshot])

  const openCustomize = () => {
    trackingPreferenceSnapshot.Sentry === "denied"
      ? setCustomErrorTracking(false)
      : setCustomErrorTracking(true)

    trackingPreferenceSnapshot.Amplitude === "denied"
      ? setCustomAnalyticsTracking(false)
      : setCustomAnalyticsTracking(true)
    setView("customize")
  }

  const acceptAll = () => {
    trackingPreferences.Sentry = "allowed"
    trackingPreferences.Amplitude = "allowed"
  }

  const rejectAll = () => {
    trackingPreferences.Sentry = "denied"
    trackingPreferences.Amplitude = "denied"
  }

  const saveCustom = () => {
    trackingPreferences.Sentry = customErrorTracking ? "allowed" : "denied"
    trackingPreferences.Amplitude = customAnalyticsTracking
      ? "allowed"
      : "denied"
  }

  if (!showBanner) {
    return null
  }

  return (
    <>
      <div className={styles.overlay} />
      <div className={styles.bannerWrapper}>
        <div className={styles.bannerContainer}>
          <Text el="h2" style="20-600">
            {translations.privacy.bannerTitle}
          </Text>

          {view === "main" && (
            <div className={styles.mainView}>
              <Text style="14-400" color="text-soft" align="center">
                {translations.privacy.mainDescription}
              </Text>
              <div className={styles.buttonsContainer}>
                <Button
                  variant="solid"
                  full
                  text={translations.privacy.acceptAllButtonLabel}
                  onClick={acceptAll}
                />
                <Button
                  variant="outlined"
                  full
                  text={translations.privacy.customizeButtonLabel}
                  onClick={openCustomize}
                />
                <Button
                  variant="outlined"
                  full
                  text={translations.privacy.rejectAllButtonLabel}
                  onClick={rejectAll}
                />
              </div>
            </div>
          )}

          {view === "customize" && (
            <div className={styles.customizeView}>
              <Text style="14-400" color="text-soft" align="center">
                {translations.privacy.customizeDescription}
              </Text>

              <div className={styles.switchContainer}>
                <Switch
                  label={translations.privacy.essentialsLabel}
                  isOn={true}
                  isDisabled
                />
                <Text style="12-400" color="text-secondary">
                  {translations.privacy.essentialsDescription}
                </Text>
              </div>

              <div className={styles.switchContainer}>
                <Switch
                  label={translations.privacy.errorTrackingLabel}
                  isOn={customErrorTracking}
                  onToggle={setCustomErrorTracking}
                />
                <Text style="12-400" color="text-secondary">
                  {translations.privacy.errorTrackingDescription}
                </Text>
              </div>

              <div className={styles.switchContainer}>
                <Switch
                  label={translations.privacy.analyticsTrackingLabel}
                  isOn={customAnalyticsTracking}
                  onToggle={setCustomAnalyticsTracking}
                />
                <Text style="12-400" color="text-secondary">
                  {translations.privacy.analyticsTrackingDescription}
                </Text>
              </div>

              <div className={styles.buttonsContainer}>
                <Button
                  variant="solid"
                  full
                  text={translations.privacy.saveButtonLabel}
                  onClick={saveCustom}
                />
                <Button
                  variant="outlined"
                  full
                  text={translations.privacy.backButtonLabel}
                  onClick={() => setView("main")}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PrivacyPolicy
