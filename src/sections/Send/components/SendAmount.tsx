import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, Icon, Text } from "ui"
import { formatUnits, parseUnits } from "viem"

import { getChainProvider } from "@/chain/provider/provider"
import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { isAmountSafe, parseAmount } from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { TokensDrawer } from "@/sections/Swap/components/TokensDrawer/TokensDrawer"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { useTranslation } from "@/translations"

import { DECIMALS_FOR_FIAT_DISPLAY } from "../constants"
import {
  setAmount,
  setAmountInSelectedCurrency,
  setShow,
  setTokenId,
  useFormSnapshot,
} from "../hooks/form"
import { useAmountLimits, useSelectedTokens } from "../hooks/transaction"
import styles from "../SendView.module.css"

export const SendAmount = (props: { inert?: boolean }) => {
  const sendTranslations = useTranslation().translations.send
  const { amountInCrypto, show, amountInSelectedCurrency } = useFormSnapshot()
  const {
    minAmount,
    maxAmount,
    maxAmountSelectedCurrency,
    minAmountSelectedCurrency,
  } = useAmountLimits() ?? {}
  const selectedCurrency = useSelectedCurrency()
  const { prices } = useTokenBalances()

  const isExceedingSelectedTokenLimits = useCallback(
    (inputValue: string) => {
      if (!maxAmount || !isAmountSafe(inputValue)) return false
      const parsedValue = parseAmount(inputValue)
      return !parsedValue.isZero() && parsedValue.gt(parseAmount(maxAmount))
    },
    [maxAmount],
  )

  const isLessThanSelectedTokenLimits = useCallback(
    (inputValue: string) => {
      if (!minAmount || !isAmountSafe(inputValue)) return false
      const parsedValue = parseAmount(inputValue)
      return !parsedValue.isZero() && parsedValue.lt(parseAmount(minAmount))
    },
    [minAmount],
  )

  const { selectedToken, selectedNativeToken } = useSelectedTokens()

  const [openDrawer, setOpenDrawer] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (spanRef.current && inputRef.current) {
      inputRef.current.style.width = `${spanRef.current.offsetWidth}px`
    }
  }, [amountInCrypto, amountInSelectedCurrency, show])

  const varInputFontSize = useMemo(() => {
    const displayedAmount =
      show === "crypto" ? amountInCrypto : amountInSelectedCurrency
    const length = displayedAmount?.length ?? 1
    return Math.max(18, 40 - (length * 22) / 14)
  }, [amountInCrypto, amountInSelectedCurrency, show])

  const tokenSelectorBtn = (
    <div
      className={styles.sendAmountTokenSelector}
      onClick={() => setOpenDrawer(true)}
    >
      <TokenLogo
        style={{ borderRadius: 50 }}
        address={selectedToken?.address ?? ""}
        chainId={selectedToken?.chainId ?? 0}
        alt={selectedToken?.symbol || sendTranslations.selectToken}
      />

      <div className={styles.sendAmountTokenInfo}>
        <Text style="16-600" translate="no">
          {selectedToken?.symbol ?? sendTranslations.selectToken}
          <Icon name="BsCaretDownFill" />
        </Text>
        {selectedToken?.chainId ? (
          <Text style="14-400" color="text-secondary">
            {selectedToken.name}
          </Text>
        ) : null}
      </div>
    </div>
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (show === "crypto") {
        handleInputChangeCrypto(e)
      } else {
        handleInputChangeSelectedCurrency(e)
      }
    },
    [maxAmount, selectedToken, show, amountInSelectedCurrency],
  )

  const handleInputChangeCrypto = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = inputFormatting(e.currentTarget.value.replace(",", "."))

      if (
        value.length > 22 ||
        isNaN(Number(value)) ||
        value.split(".").length > 2
      ) {
        return
      }

      if (
        value.includes(".") &&
        value.split(".")[1].length > (selectedToken?.decimals ?? 0)
      ) {
        return
      }

      setAmount(value)

      if (selectedToken) {
        const tokenPrice = prices?.getBy(selectedToken)
        if (tokenPrice) {
          setAmountInSelectedCurrency(
            (Number(value) * Number(tokenPrice)).toFixed(
              DECIMALS_FOR_FIAT_DISPLAY,
            ),
          )
        }
      }
    },
    [maxAmount, selectedToken, show, prices],
  )

  const handleInputChangeSelectedCurrency = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = inputFormatting(e.currentTarget.value.replace(",", "."))

      if (
        isNaN(Number(value)) ||
        (maxAmountSelectedCurrency &&
          Number(value) > Number(maxAmountSelectedCurrency)) ||
        value.split(".").length > 2
      ) {
        return
      }

      if (
        value.includes(".") &&
        value.split(".")[1].length > DECIMALS_FOR_FIAT_DISPLAY
      ) {
        return
      }

      setAmountInSelectedCurrency(value)

      if (selectedToken) {
        const tokenPrice = prices?.getBy(selectedToken)
        if (tokenPrice && Number(tokenPrice) > 0) {
          const units =
            (parseUnits(value, 36) * BigInt(10 ** selectedToken.decimals)) /
            parseUnits(tokenPrice.toString(), 36)
          const amount = formatUnits(units, selectedToken.decimals)

          setAmount(amount)
        }
      }
    },
    [maxAmountSelectedCurrency, selectedToken, prices, show],
  )

  const inputFormatting = (value: string) => {
    if (value.startsWith(".") || value.startsWith(",")) {
      value = "0" + value
    }

    if (
      value.startsWith("00") ||
      (value.startsWith("0") && !value.startsWith("0."))
    ) {
      value = value.slice(1)
    }

    if (show === "selectedCurrency") {
      if (
        maxAmountSelectedCurrency &&
        Number(value) > Number(maxAmountSelectedCurrency)
      ) {
        value = maxAmountSelectedCurrency.toString()
      }
    }

    return value
  }

  const chainProvider = selectedToken && getChainProvider(selectedToken.chainId)

  return (
    <Box
      vertical
      elevation="high"
      tabIndex={1}
      disabled={props.inert}
      onClick={() => selectedToken && inputRef.current?.focus()}
    >
      {props.inert ? null : (
        <Box>
          {tokenSelectorBtn}

          <Button
            variant="pill"
            text={sendTranslations.max}
            disabled={
              !selectedToken || !maxAmount || amountInCrypto === maxAmount
            }
            onClick={() => {
              if (!maxAmount) return
              setAmount(maxAmount)
              setAmountInSelectedCurrency(maxAmountSelectedCurrency)
            }}
          />
        </Box>
      )}

      <Box vertical align="center" gap="small">
        <div className={styles.sendAmountInputWrapper}>
          <input
            ref={inputRef}
            title="Input amount"
            className={styles.sendAmountInput}
            readOnly={props.inert || !selectedToken}
            type="text"
            inputMode="decimal"
            min={show === "crypto" ? minAmount : minAmountSelectedCurrency}
            max={show === "crypto" ? maxAmount : maxAmountSelectedCurrency}
            value={
              (show === "crypto" ? amountInCrypto : amountInSelectedCurrency) ||
              ""
            }
            placeholder="0"
            translate="no"
            autoFocus={!!selectedToken}
            onChange={handleInputChange}
            style={{
              fontSize: varInputFontSize,
              visibility: openDrawer ? "hidden" : "visible",
              pointerEvents: openDrawer || !selectedToken ? "none" : "auto",
              width: 25,
            }}
          />

          <span
            ref={spanRef}
            className={styles.sendAmountHiddenSpan}
            style={{ fontSize: varInputFontSize }}
            translate="no"
          >
            {(show === "crypto" ? amountInCrypto : amountInSelectedCurrency) ||
              "0"}
          </span>

          <span
            className={styles.sendAmountTokenSymbol}
            style={{ fontSize: varInputFontSize }}
            translate="no"
          >
            {show === "crypto"
              ? selectedToken?.symbol
              : selectedCurrency.currency}
          </span>
        </div>
        {selectedToken && prices?.getBy(selectedToken) && (
          <Button
            variant="ghost"
            size="small"
            icon={props.inert ? undefined : "BsArrowRepeat"}
            text={
              show === "crypto"
                ? `${amountInSelectedCurrency || 0} ${selectedCurrency.symbol}`
                : formatTokenAmount(amountInCrypto || 0, selectedToken.symbol)
            }
            onClick={() =>
              setShow(show === "crypto" ? "selectedCurrency" : "crypto")
            }
            disabled={!!props.inert}
          />
        )}
        {props.inert || !selectedToken ? null : isExceedingSelectedTokenLimits(
            amountInCrypto ?? "",
          ) || maxAmount === "0" ? (
          <Text style="12-400" color="error" align="center">
            {sendTranslations.insufficientResourcesForNetworkCost(
              selectedNativeToken?.symbol ?? "",
              chainProvider?.family === "EVM",
            )}
          </Text>
        ) : isLessThanSelectedTokenLimits(amountInCrypto ?? "") ? (
          <Text style="12-400" color="error" align="center">
            {sendTranslations.lessThanMinimumAmount}
          </Text>
        ) : (
          <Box width="content" gap="small">
            <Icon name="BsWallet2" />
            <Text style="12-400" color="text-soft" align="center">
              {show === "crypto" && maxAmount ? (
                <span translate="no">
                  {formatTokenAmount(maxAmount, selectedToken.symbol)}
                </span>
              ) : null}
              {show === "selectedCurrency" ? (
                <span translate="no">
                  {`${maxAmountSelectedCurrency} ${selectedCurrency.symbol}`}
                </span>
              ) : null}{" "}
              {sendTranslations.availableFunds}
            </Text>
          </Box>
        )}
      </Box>

      <TokensDrawer
        filter="onlyTokensWithBalance"
        selectedToken={selectedToken}
        isOpen={openDrawer}
        onClose={() => {
          inputRef.current?.focus()
          setOpenDrawer(false)
        }}
        onSelect={(token) => {
          setTokenId(token)
          setAmount(undefined)
          setAmountInSelectedCurrency(undefined)
          setOpenDrawer(false)
        }}
      />
    </Box>
  )
}
