import { proxy } from "valtio"

type InactivityStore = {
  isActive: boolean
  lastInteractionTime: number
  inactivityTimeoutMs: number
}

export const inactivityStore = proxy<InactivityStore>({
  isActive: true,
  lastInteractionTime: Date.now(),
  inactivityTimeoutMs: 1000 * 60 * 5, // 5 minutes
})

const updateInactivityStore = () => {
  const resetInactivity = () => {
    inactivityStore.lastInteractionTime = Date.now()
    inactivityStore.isActive = true
  }

  if (!window) {
    return () => {}
  }

  // Track user interactions
  const events = [
    "mousemove",
    "keydown",
    "click",
    "touchstart",
    "scroll",
    "wheel",
  ]
  events.forEach((event) => {
    window.addEventListener(event, resetInactivity, { passive: true })
  })

  // Check inactivity every 10 seconds
  const inactivityCheckInterval = setInterval(() => {
    const timeSinceLastInteraction =
      Date.now() - inactivityStore.lastInteractionTime
    inactivityStore.isActive =
      timeSinceLastInteraction < inactivityStore.inactivityTimeoutMs
  }, 10_000)

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, resetInactivity)
    })
    clearInterval(inactivityCheckInterval)
  }
}

updateInactivityStore()
