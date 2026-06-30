import {
  captureRequestError,
  captureRouterTransitionStart,
} from "@sentry/nextjs"
import { subscribeKey } from "valtio/utils"

import { config } from "./config"
import {
  type TrackingState,
  trackingPreferences,
} from "./src/stores/trackingPreferencesStore"

let isAmplitudeInit = false
let isSentryInit = false

const initSentryIdempotent = async (trackingState: TrackingState) => {
  if (trackingState !== "allowed" || isSentryInit) return
  const {
    httpClientIntegration,
    init: initSentry,
    replayIntegration,
    browserSessionIntegration,
    breadcrumbsIntegration,
  } = await import("@sentry/nextjs")
  isSentryInit = true
  initSentry({
    ...config.sentryConfig,
    ignoreErrors: ["Amplitude"],
    denyUrls: [
      "https://api2.amplitude.com/2/httpapi",
      "https://li.quest/v1/advanced/routes",
    ],
    integrations: [
      breadcrumbsIntegration(),
      browserSessionIntegration(),
      httpClientIntegration({
        failedRequestStatusCodes: [
          [400, 499],
          [500, 599],
        ],
      }),
      replayIntegration({
        maskAllText: false,
        blockAllMedia: true,
      }),
    ],
    tracePropagationTargets: [/^\/api\//],
    sendDefaultPii: false,
  })
}

const initAmplitudeIdempotent = async (trackingState: TrackingState) => {
  if (
    trackingState !== "allowed" ||
    isAmplitudeInit ||
    !config.amplitudeConfig.apiKey
  )
    return
  isAmplitudeInit = true
  const { init: initAmplitude, flush } = await import(
    "@amplitude/analytics-browser"
  )
  return initAmplitude(config.amplitudeConfig.apiKey, undefined, {
    identityStorage: "localStorage",
    logLevel: 0,
    autocapture: {
      attribution: false,
      sessions: true,
      pageViews: {
        trackHistoryChanges: "pathOnly",
      },
    },
  }).promise.then(flush)
}

initSentryIdempotent(trackingPreferences.Sentry)
initAmplitudeIdempotent(trackingPreferences.Amplitude)

subscribeKey(trackingPreferences, "Sentry", initSentryIdempotent)
subscribeKey(trackingPreferences, "Amplitude", initAmplitudeIdempotent)

export const onRouterTransitionStart = captureRouterTransitionStart
export const onRequestError = captureRequestError
