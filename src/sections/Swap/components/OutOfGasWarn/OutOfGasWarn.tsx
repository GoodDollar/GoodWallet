import { useMemo } from "react"
import { Icon, Text } from "ui"

import { getChainName } from "@/chain/chains"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { formatUnits } from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useTranslation } from "@/translations"

import styles from "./OutOfGasWarn.module.css"

export const OutOfGasWarn = (props: {
  requiredGasForSelectedRoute: Map<number, bigint>
}) => {
  const { translations } = useTranslation()

  const { title, text, seperator } =
    translations.swap.errors.insufficientBalanceForGas
  const { tokens } = useTokenBalances()

  const requiredGasForSelectedRouteFormatted = useMemo(() => {
    const gasAmounts = []
    for (const [chainId, requiredGas] of props.requiredGasForSelectedRoute) {
      const token = tokens?.getNativeBy({ chainId })
      if (token) {
        gasAmounts.push({
          token,
          amount: formatUnits(requiredGas, token.decimals),
        })
      }
    }
    return gasAmounts
  }, [props.requiredGasForSelectedRoute, tokens])

  return (
    <div className={styles.gasBox}>
      <Text style="14-600" color="error" align="left">
        <Icon name="BsFuelPump" color="red" />
        {title}
      </Text>

      <Text style="12-600" color="text-soft">
        {text}
      </Text>

      {requiredGasForSelectedRouteFormatted.map(({ token, amount }) => (
        <div key={token.chainId} className={styles.gasRow}>
          <Text style="12-600" align="center" color="text-soft">
            {`${formatTokenAmount(amount, token.symbol)} ${seperator} ${getChainName(token.chainId)}`}
          </Text>
        </div>
      ))}
    </div>
  )
}
