import { type FC, Fragment, useCallback, useEffect, useRef } from "react"
import HCaptcha from "@hcaptcha/react-hcaptcha"

import { usePromise } from "@/hooks/utils"

const CAPTCHA_VERIFIER = "https://verify.goodworker.workers.dev"

type CaptchaWrappedProps = {
  launchCaptcha: () => Promise<void>
}

type CaptchaProps = {
  env: string
  captchaKey: string
  onVerified: () => unknown
  children: FC<CaptchaWrappedProps>
}

export const Captcha: FC<CaptchaProps> = ({
  captchaKey,
  env,
  onVerified,
  children,
}) => {
  const captchaRef = useRef<HCaptcha>(null)
  const onExpired = useCallback(() => captchaRef.current?.resetCaptcha(), [])
  const [whenLoaded, setLoaded] = usePromise()
  const CaptchaWrapped = children ?? Fragment

  const onVerify = useCallback(
    async (payload: string) => {
      const response = await fetch(`${CAPTCHA_VERIFIER}/verify/recaptcha`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          env,
          payload,
          captchaType: "hcaptcha",
        }),
      })

      const { success } = await response.json()

      if (success) {
        onVerified()
      }
    },
    [onVerified, env],
  )

  const launchCaptcha = useCallback(async () => {
    await whenLoaded
    captchaRef.current?.execute()
  }, [])

  // this is needed because hcaptcha does not triggers onLoad is external script already loaded
  // it just renders and immediately sets isReady true
  useEffect(() => {
    if (captchaRef.current?.isReady()) {
      setLoaded()
    }
  }, [setLoaded])

  return (
    <>
      <HCaptcha
        sitekey={captchaKey}
        sentry={false}
        onLoad={setLoaded}
        onVerify={onVerify}
        onExpire={onExpired}
        ref={captchaRef}
        size="invisible"
      />
      <CaptchaWrapped launchCaptcha={launchCaptcha} />
    </>
  )
}
