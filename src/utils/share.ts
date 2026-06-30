export const canShare = (text: string) =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  !!navigator.canShare?.({ text })
