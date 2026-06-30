import { useState } from "react"
import { Button, Text } from "ui"

import type { PolymarketMarket } from "../../hooks/useMarkets"
import styles from "./MarketDrawer.module.css"
import { MarketGraph } from "./MarketGraph"

const DESCRIPTION_CHAR_LIMIT = 200

export const MarketDrawer = ({ market }: { market: PolymarketMarket }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const description = market.description || ""
  const shouldTruncate = description.length > DESCRIPTION_CHAR_LIMIT

  const displayedDescription =
    shouldTruncate && !isExpanded
      ? `${description.slice(0, DESCRIPTION_CHAR_LIMIT)}...`
      : description

  return (
    <div className={styles.container}>
      <Text el="h1" style="20-600" className={styles.title}>
        {market.question}
      </Text>
      <MarketGraph market={market} />
      <div className={styles.description}>
        <Text style="14-400" color="text-soft">
          {displayedDescription}
        </Text>
        {shouldTruncate && (
          <Button
            variant="ghost"
            text={isExpanded ? "Show less" : "Show more"}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        )}
      </div>
    </div>
  )
}
