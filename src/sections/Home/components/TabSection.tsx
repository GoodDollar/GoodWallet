"use client"

import { CryptoOnRampGuide } from "@/components/CryptoOnRampGuide/CryptoOnRampGuide"
import { Tab, Tabs } from "@/components/Snippet/Tabs/Tabs"
import { useTokenBalances } from "@/hooks/useTokenBalances"

import { ActivityHistory } from "./ActivityHistory/ActivityHistory"
import { TokenList } from "./TokenList/TokenList"

export default function TabSection() {
  const { balances } = useTokenBalances()

  return (
    <div className="flex-1 px-6">
      <Tabs>
        <Tab tabPage="home" tabId="crypto">
          {!balances?.byUsdValue.length ? <CryptoOnRampGuide /> : <TokenList />}
        </Tab>
        <Tab tabPage="home" tabId="activity">
          <ActivityHistory />
        </Tab>
      </Tabs>
    </div>
  )
}
