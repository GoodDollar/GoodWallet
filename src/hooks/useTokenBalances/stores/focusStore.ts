import { proxy } from "valtio"

type FocusStore = {
  isWalletInFocus: boolean
}

export const focusStore = proxy<FocusStore>({
  isWalletInFocus: document ? document.hasFocus() : true,
})
const updateFocusStore = () => {
  const onFocus = () => {
    focusStore.isWalletInFocus = true
  }
  const onBlur = () => {
    focusStore.isWalletInFocus = false
  }

  if (!window) {
    focusStore.isWalletInFocus = true
    return () => {}
  }

  window.addEventListener("focus", onFocus)
  window.addEventListener("blur", onBlur)

  return () => {
    window.removeEventListener("focus", onFocus)
    window.removeEventListener("blur", onBlur)
  }
}

updateFocusStore()
