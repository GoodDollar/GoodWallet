import type { Route } from "@lifi/sdk"
import { proxy, ref, subscribe } from "valtio"

type SwapDialog = {
  title: string
  route?: Route
  message?: string
  rejectBtnText?: string
  acceptBtnText?: string
  status: "pending" | "accepted" | "rejected"
  exiting?: boolean
}

export const swapDialogStore = proxy<SwapDialog>()

export const openSwapDialog = async (
  args: Omit<SwapDialog, "status" | "exiting">,
) => {
  const route = args.route
  Object.assign(swapDialogStore, {
    status: "pending",
    exiting: false,
    acceptBtnText: args.acceptBtnText,
    rejectBtnText: args.rejectBtnText,
    title: args.title,
    //Use ref as proxy mutates the route and makes structured clone in executeRoute fail
    route: route ? ref(route) : undefined,
    message: args.message,
  } satisfies SwapDialog)

  await new Promise((resolve) => {
    subscribe(swapDialogStore, () => {
      if (swapDialogStore.status !== "pending") {
        resolve(swapDialogStore)
      }
    })
  })

  return swapDialogStore.status as SwapDialog["status"]
}

export const updateSwapDialogStatus = async (status: SwapDialog["status"]) => {
  swapDialogStore.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  swapDialogStore.status = status
}
