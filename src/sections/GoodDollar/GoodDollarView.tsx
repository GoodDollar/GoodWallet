"use client"

import { Tab, Tabs } from "@/components/Snippet/Tabs/Tabs"

import ClaimView from "./components/Claim/ClaimView"
import InviteView from "./components/Invite/InviteView"
import NewsView from "./components/News/NewsView"

export type GoodDollarTab = "claim" | "inviteRewards" | "news"

export default function GoodDollarView({
  initialTab,
}: {
  initialTab?: GoodDollarTab
}) {
  return (
    <div className="h-full px-6 mt-[12px]">
      <Tabs activeTab={initialTab}>
        <Tab tabPage="gooddollar" tabId="claim">
          <ClaimView />
        </Tab>
        <Tab tabPage="gooddollar" tabId="inviteRewards">
          <InviteView />
        </Tab>
        <Tab tabPage="gooddollar" tabId="news">
          <NewsView />
        </Tab>
      </Tabs>
    </div>
  )
}
