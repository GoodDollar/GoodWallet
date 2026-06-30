"use client"

import { Tab, Tabs } from "@/components/Snippet/Tabs/Tabs"

import HighVolumeMarkets from "./Events/index.tsx"
import ActiveOrders from "./Orders/index.tsx"
import UserPositions from "./Positions/index.tsx"

export default function MarketTabs() {
  return (
    <Tabs>
      <Tab tabPage="predictions" tabId="markets">
        <HighVolumeMarkets />
      </Tab>
      <Tab tabPage="predictions" tabId="openOrders">
        <ActiveOrders />
      </Tab>
      <Tab tabPage="predictions" tabId="positions">
        <UserPositions />
      </Tab>
    </Tabs>
  )
}
