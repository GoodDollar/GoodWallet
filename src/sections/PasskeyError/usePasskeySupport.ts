import { useState } from "react"

import { useEffectOnce } from "@/hooks/utils"

export function usePasskeySupport() {
  const [supportsPasskey, setSupportsPasskey] = useState<boolean | null>(null)
  useEffectOnce(() => {
    if (typeof window !== "undefined") {
      ;(async () => {
        const isSupported = await detectPasskeySupport()
        setSupportsPasskey(isSupported)
      })()
    }
  }, [setSupportsPasskey])

  return supportsPasskey
}

const detectPasskeySupport = async (): Promise<boolean> => {
  if (typeof window.PublicKeyCredential === "undefined") {
    return false
  }

  return true
  // return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}
