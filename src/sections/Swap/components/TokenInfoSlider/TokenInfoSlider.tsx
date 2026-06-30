import { Button, Divider } from "ui"

import { getChainName, openContractInExplorer } from "@/chain/chains"
import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { truncateString } from "@/components/Utils/format"
import {
  formatTokenPrice,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { isNativeToken } from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import {
  SliderRow,
  TwoElementStacked,
} from "@/sections/Home/components/ActivityHistory/ActivityHistorySliderItem"
import { useSelectedCurrency } from "@/stores/currencyStore"
import type { TokenIdentifier, TokenInfo } from "@/tokens/types"
import { useTranslation } from "@/translations"

import styles from "./TokenInfoSlider.module.css"

export const TokenInfoSlider = ({
  token,
}: {
  token: TokenIdentifier & TokenInfo
}) => {
  const selectedCurrency = useSelectedCurrency()
  const { translations } = useTranslation()
  const { prices } = useTokenBalances()

  return (
    <>
      <SliderRow label={translations.swap.tokenInformation.token}>
        <TokenLogo
          address={token.address}
          chainId={token.chainId}
          alt={token.name}
        />
        <div className={styles.tokenInfo}>
          <TwoElementStacked el1={token.name} el2={token.symbol} />
        </div>
      </SliderRow>
      {token.chainId && (
        <>
          <Divider color="muted" />
          <SliderRow label={translations.swap.tokenInformation.chain}>
            {getChainName(token.chainId)}
          </SliderRow>
        </>
      )}
      {token.marketCapUSD != undefined && token.marketCapUSD > 0 && (
        <>
          <Divider color="muted" />
          <SliderRow label={translations.swap.tokenInformation.marketCap}>
            {formatTokenValue(token.marketCapUSD, selectedCurrency)}
          </SliderRow>
        </>
      )}
      {token.volumeUSD24H != undefined && token.volumeUSD24H > 0 && (
        <>
          <Divider color="muted" />
          <SliderRow label={translations.swap.tokenInformation.volume}>
            {formatTokenValue(token.volumeUSD24H, selectedCurrency)}
          </SliderRow>
        </>
      )}
      {token.address && !isNativeToken(token.address) && token.chainId && (
        <>
          <Divider color="muted" />
          <SliderRow label={translations.swap.tokenInformation.address}>
            <div>{truncateString(token.address, 12, 4)} </div>
            <Button variant="square" icon="BsCopy" copyValue={token.address} />
            <Button
              variant="square"
              icon="BsLink45Deg"
              onClick={() =>
                window.open(
                  openContractInExplorer(token.address, token.chainId),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            />
          </SliderRow>
        </>
      )}
      {prices?.getBy(token) && (
        <>
          <Divider color="muted" />
          <SliderRow label={translations.swap.tokenInformation.price}>
            <>{formatTokenPrice(prices?.getBy(token) ?? 0, selectedCurrency)}</>
          </SliderRow>
        </>
      )}
    </>
  )
}
