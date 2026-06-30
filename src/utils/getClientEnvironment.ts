// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
"use client"

export const isDeltaMobile = () => {
  return (window as any).ReactNativeWebView ? true : false
}

export const isPasskeyEnabled = () => {
  return (window as any).PublicKeyCredential ? true : false
}
