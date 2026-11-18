import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  createNotification,
  notificationStore,
} from "@/ui/notifications/notificationStore"

import { Web3AuthLoginUnavailableNotice } from "./Web3AuthLoginUnavailableNotice"

describe("Web3AuthLoginUnavailableNotice", () => {
  const markup = renderToStaticMarkup(<Web3AuthLoginUnavailableNotice />)

  it("shows the title and the funds-are-safe message", () => {
    expect(markup).toContain("Login temporarily unavailable")
    expect(markup).toContain("Your funds are safe.")
  })

  it("embeds both links in the text and opens them in a new tab", () => {
    expect(markup).toMatch(
      /<a href="https:\/\/ubi\.gd\/48e55xo"[^>]*target="_blank"[^>]*>Web3Auth status updates<\/a>/,
    )
    expect(markup).toMatch(
      /<a href="https:\/\/ubi\.gd\/3UU3Dgu"[^>]*target="_blank"[^>]*>claim through GoodDapp<\/a>/,
    )
  })

  it("does not block browser translation", () => {
    expect(markup).not.toContain('translate="no"')
  })
})

describe("persistent notice toast", () => {
  it("stays in the store and is not flagged for auto-close", () => {
    const id = createNotification({
      content: <Web3AuthLoginUnavailableNotice />,
      status: "error",
    })

    expect(notificationStore[id]?.autoClose).toBeUndefined()
    expect(notificationStore[id]?.content).toBeDefined()
  })
})
