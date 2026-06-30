import { useSnapshot } from "valtio"

import {
  createNotification,
  notificationStore,
  removeNotification,
  updateNotification,
} from "./notificationStore"

export const useNotifications = () => {
  const snap = useSnapshot(notificationStore)
  return {
    notifications: Object.values(snap),
    createNotification,
    updateNotification,
    removeNotification,
  }
}
