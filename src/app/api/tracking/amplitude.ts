import { init, track } from "@amplitude/analytics-node"

import type { AnalyticsEvent } from "@/analytics/types"
import { amplitudeConfig } from "@/configServerless"

if (amplitudeConfig.apiKey) {
  init(amplitudeConfig.apiKey)
}

export const capture = (event: AnalyticsEvent) => {
  const { type, ...rest } = event
  track(
    type,
    { ...rest },
    {
      user_id: "backend_tokens_cache", // user_id is required for nodejs amplitude sdk
    },
  )
}
