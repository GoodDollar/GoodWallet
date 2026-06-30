import { proxy, subscribe } from "valtio"

type Dialog = {
  id: string
  title: string
  bodyText?: string
  bodyAlign?: "left" | "center" | "right"
  imgSrc?: string
  imgCaption?: string
  rejectBtnText?: string
  acceptBtnText?: string
  acceptAction?: () => void
  onClose?: () => void
  status: "pending" | "accepted" | "rejected"
  exiting?: boolean
  shouldHideCloseButton?: boolean
}

export const dialogStore = proxy<{
  queue: Dialog[]
}>({ queue: [] })

export const openDialog = async (
  args: Omit<Dialog, "id" | "status" | "exiting">,
) => {
  const id = (Math.random() + 1).toString(36).substring(7)

  dialogStore.queue.push({
    ...args,
    id,
    status: "pending",
    exiting: false,
  })

  const status = await new Promise<Exclude<Dialog["status"], "pending">>(
    (resolve) => {
      const unsubscribe = subscribe(dialogStore, () => {
        const index = dialogStore.queue.findIndex((d) => d.id === id)
        const d = dialogStore.queue[index]
        if (!d) {
          throw new Error(`couldn't find dialog with id: ${id}`)
        }
        if (d.status !== "pending") {
          dialogStore.queue.splice(index, 1)
          unsubscribe()
          resolve(d.status)
        }
      })
    },
  )

  return status
}

export const updateStatus = async (id: string, status: Dialog["status"]) => {
  const d = dialogStore.queue.find((d) => d.id === id)
  if (!d) {
    throw new Error("update status failed")
  }

  d.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  d.status = status
}
