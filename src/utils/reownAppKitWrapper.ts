export const WC_URI_CODE_STORAGE_KEY = "WALLET_CONNECT_URI"

let uriFromStorage =
  typeof sessionStorage === "undefined"
    ? null
    : sessionStorage.getItem(WC_URI_CODE_STORAGE_KEY)

export const setWCUri = (value: string | null) => {
  uriFromStorage = value
  if (typeof sessionStorage !== "undefined") {
    if (value) {
      sessionStorage.setItem(WC_URI_CODE_STORAGE_KEY, value)
    } else {
      sessionStorage.removeItem(WC_URI_CODE_STORAGE_KEY)
    }
  }
}

export const getWCUri = () => uriFromStorage

let closeAfterAction = !!uriFromStorage
export const setCloseAfterWCAction = (value: boolean) => {
  closeAfterAction = value
}
export const getCloseAfterWCAction = () => closeAfterAction
