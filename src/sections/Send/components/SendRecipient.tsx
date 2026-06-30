import { useState } from "react"
import { useDebouncedEffect } from "@react-hookz/web"
import { Box, Button, Text } from "ui"

import { getChainProvider } from "@/chain/provider/provider"
import QrScanner from "@/components/QrScanner/QrScanner"
import { useTranslation } from "@/translations"

import { setToAddress, setToEns, useFormSnapshot } from "../hooks/form"
import { useSelectedTokens } from "../hooks/transaction"
import styles from "../SendView.module.css"
import { SendRecent } from "./SendRecent"

export const SendRecipient = (props: { inert?: boolean }) => {
  const { selectedToken } = useSelectedTokens()
  const { toAddress } = useFormSnapshot()

  const sendTranslations = useTranslation().translations.send

  const [showQrScanner, setShowQrScanner] = useState(false)

  const [addressLike, setAddressLike] = useState(toAddress)

  useDebouncedEffect(
    async () => {
      try {
        if (!addressLike || !selectedToken) {
          setToAddress(undefined)
          setToEns(undefined)
          return
        }
        const chainProvider = getChainProvider(selectedToken.chainId)
        if (chainProvider.isValidAddress(addressLike)) {
          setToAddress(addressLike)
          setToEns(undefined)
          return
        }
        const ensAddress = await chainProvider.getAddressForName(addressLike)
        if (ensAddress && chainProvider.isValidAddress(ensAddress)) {
          setToAddress(ensAddress)
          setToEns(addressLike)
          return
        }
        setToAddress(undefined)
        setToEns(undefined)
      } catch {
        setToAddress(undefined)
        setToEns(undefined)
      }
    },
    [addressLike, selectedToken],
    500,
    15000,
  )

  const chainProvider = selectedToken
    ? getChainProvider(selectedToken.chainId)
    : null
  const toPlaceHolder = chainProvider
    ? sendTranslations.toPlaceholder[chainProvider.family]
    : sendTranslations.toPlaceholderGeneric

  const isDisabled = props.inert || !selectedToken

  return (
    <>
      <Box vertical elevation="high" tabIndex={1} disabled={isDisabled}>
        <Box>
          <Text style="16-600">
            {showQrScanner ? sendTranslations.scanQrLabel : sendTranslations.to}
          </Text>

          {showQrScanner ? (
            <Button
              variant="pill"
              text={sendTranslations.closeBtnLabel}
              onClick={() => setShowQrScanner(false)}
            />
          ) : null}
        </Box>

        {/* qr scanner */}
        {showQrScanner ? (
          <QrScanner
            openCamera
            onScan={(result) => {
              setAddressLike(result.split(":")[1] || result)
              setShowQrScanner(false)
            }}
          />
        ) : (
          <Box>
            <input
              title="Input recipient address"
              readOnly={isDisabled}
              className={styles.sendRecipientInput}
              type="text"
              value={addressLike || ""}
              placeholder={toPlaceHolder}
              onChange={(e) => setAddressLike(e.currentTarget.value)}
            />

            {isDisabled ? null : (
              <div className={styles.validationMarksContainer}>
                {addressLike ? (
                  <Button
                    variant="pill"
                    text={sendTranslations.clearBtnLabel}
                    onClick={() => setAddressLike(undefined)}
                  />
                ) : (
                  <Button
                    variant="pill"
                    icon="BsQrCodeScan"
                    onClick={() => setShowQrScanner(true)}
                  />
                )}
              </div>
            )}
          </Box>
        )}
      </Box>

      {selectedToken && <SendRecent onSelectAddress={setAddressLike} />}
    </>
  )
}
