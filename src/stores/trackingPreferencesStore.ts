import { proxy, subscribe } from "valtio"

const SENTRY_TRACKING_STATE_KEY = "Tracking_Sentry"
const AMPLITUDE_TRACKING_STATE_KEY = "Tracking_Amplitude"

export type TrackingState = "allowed" | "denied" | "unknown"
type TrackingPreferencesStore = {
  Sentry: TrackingState
  Amplitude: TrackingState
}

const getTrackingState = (key: string): TrackingState => {
  if (typeof window === "undefined") {
    return "denied"
  }
  const storedState = window.localStorage.getItem(key)
  if (storedState === null) {
    return "unknown"
  }
  if (storedState === "allowed") {
    return storedState
  }
  return "denied"
}

const persistsTrackingState = (key: string, state: TrackingState) => {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(key, state)
}

export const trackingPreferences = proxy<TrackingPreferencesStore>({
  Sentry: getTrackingState(SENTRY_TRACKING_STATE_KEY),
  Amplitude: getTrackingState(AMPLITUDE_TRACKING_STATE_KEY),
})

subscribe(trackingPreferences, () => {
  persistsTrackingState(SENTRY_TRACKING_STATE_KEY, trackingPreferences.Sentry)
  persistsTrackingState(
    AMPLITUDE_TRACKING_STATE_KEY,
    trackingPreferences.Amplitude,
  )
})
