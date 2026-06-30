import { useNotifications } from "./notifications/useNotifications"

export * from "./assets"
export * from "./box/Box"
export * from "./button/Button"
export * from "./dialog/Dialog"
export * from "./dialog/dialogStore"
export * from "./divider/Divider"
export * from "./drawer/Drawer"
export * from "./icon/Icon"
export { Notifications as Toast } from "./notifications/Notifications" // Notifications → Toast
export {
  createNotification as createToast,
  notificationStore as toastStore,
  removeNotification as removeToast,
  updateNotification as updateToast,
} from "./notifications/notificationStore"
export { default as Text } from "./typography/Typography" // Typography → Text

export const useToast = () => {
  const {
    notifications,
    createNotification,
    updateNotification,
    removeNotification,
  } = useNotifications()
  return {
    toasts: notifications,
    createToast: createNotification,
    updateToast: updateNotification,
    removeToast: removeNotification,
  }
}
