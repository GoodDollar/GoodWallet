import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

//Note beforeinstallprompt doesn't fire, if the PWA is already installed
export let installPrompt: BeforeInstallPromptEvent | undefined = undefined
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault()
  installPrompt = event as BeforeInstallPromptEvent
})

window.addEventListener("appinstalled", () => {
  captureEvent({ type: AnalyticsEventTypes.AppInstalled })
})

export const isPwa = () =>
  ["fullscreen", "standalone", "minimal-ui"].some(
    (displayMode) =>
      window.matchMedia("(display-mode: " + displayMode + ")").matches,
  )
