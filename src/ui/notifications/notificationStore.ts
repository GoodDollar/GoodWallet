import { proxy } from "valtio"

type Notification = {
  id: string
  message?: string
  status?: "pending" | "success" | "error"
  autoClose?: boolean
  closing?: boolean
}

export const notificationStore = proxy<Record<string, Notification>>({})

export const createNotification = (
  args: Pick<Notification, "message" | "status" | "autoClose">,
) => {
  const id = Math.random().toString(36).substring(2, 9)
  notificationStore[id] = { id, ...args }
  if (args.autoClose) setAutoClose(id)
  return id
}

export const updateNotification = (args: Omit<Notification, "closing">) => {
  if (args.autoClose) setAutoClose(args.id)
  notificationStore[args.id] = { ...notificationStore[args.id], ...args }
}

export const removeNotification = async (args: Pick<Notification, "id">) => {
  if (args.id && notificationStore[args.id])
    notificationStore[args.id].closing = true
  // Wait for the exit animation to finish
  await new Promise((resolve) => setTimeout(resolve, 500))
  delete notificationStore[args.id]
}

export const setAutoClose = async (id: string) => {
  if (notificationStore[id]) notificationStore[id].autoClose = true
  // Wait for the closing animation to finish
  await new Promise((resolve) => setTimeout(resolve, 3000))
  removeNotification({ id })
}
