import { useState } from "react"
import { Button, Icon, Text } from "ui"

import { Logo } from "@/components/Typo/Logo"

import styles from "./PasskeyErrorView.module.css"

export default function PasskeyErrorView() {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  return (
    <div className={styles.container}>
      <Logo className="m-auto" />

      <div className={styles.sliderContainer}>
        <div className={styles.slide}>
          <Icon name="BsExclamationTriangle" color="main" size="big" />
          <Text align="center" style="24-600">
            Passkey Not Supported
          </Text>
          <Text align="center" style="14-400" color="text-secondary">
            This usually happens when:
          </Text>
          <div className={styles.content}>
            <div className={styles.reasonsList}>
              <div className={styles.reasonItem}>
                <Icon name="BsQrCodeScan" color="main" />
                <Text align="left" style="14-400" color="text-secondary">
                  You're using an embedded in-app browser (Facebook, Instagram,
                  etc.)
                </Text>
              </div>
              <div className={styles.reasonItem}>
                <Icon name="BsClockHistory" color="main" />
                <Text align="left" style="14-400" color="text-secondary">
                  Your browser version is outdated
                </Text>
              </div>
              <div className={styles.reasonItem}>
                <Icon name="BsGearFill" color="main" />
                <Text align="left" style="14-400" color="text-secondary">
                  Passkeys are disabled in your browser settings
                </Text>
              </div>
              <div className={styles.reasonItem}>
                <Icon name="BsExclamationCircleFill" color="main" />
                <Text align="left" style="14-400" color="text-secondary">
                  Your device doesn't support biometric authentication
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Text align="center" style="14-400" color="text-secondary">
          Please open this page in your default browser (Safari, Chrome,
          Firefox, or Edge) to continue.
        </Text>
        <Button
          variant="solid"
          full
          icon={copied ? "BsCheckCircleFill" : "BsCopy"}
          text={copied ? "Copied!" : "Copy Link to Open in Browser"}
          onClick={handleCopyUrl}
          disabled={copied}
        />
      </div>
    </div>
  )
}
