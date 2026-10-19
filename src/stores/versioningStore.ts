import { proxy } from "valtio"

type VersionResponse = {
  version?: string
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
    // A cached response can describe a previous deployment and make the
    // update prompt appear again after the page is refreshed.
    const res = await fetch(`/api/version?t=${Date.now()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(`Version request failed with status ${res.status}`)
    }

    const parsedResponse = (await res.json()) as VersionResponse
    if (parsedResponse.version) {
      pwaVersionStore.remoteVersion = parsedResponse.version
    }
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
