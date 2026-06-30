import { proxy } from "valtio"

type VersionResponse = {
  version: string
}

type PwaVersioningStore = {
  remoteVersion: string | undefined
}

export const pwaVersionStore = proxy<PwaVersioningStore>({
  remoteVersion: undefined,
})

const POLLING_INTERVAL = 5 * 60 * 1000

const refreshVersion = async (): Promise<void> => {
  try {
    const res = await fetch("/api/version")
    const parsedResponse = (await res.json()) as VersionResponse
    pwaVersionStore.remoteVersion = parsedResponse.version
  } catch (error) {
    console.error(error)
  }
}

const onAppResume = (): void => {
  if (document.visibilityState === "visible") {
    refreshVersion()
  }
}

refreshVersion()
setInterval(refreshVersion, POLLING_INTERVAL)

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", onAppResume)
}
