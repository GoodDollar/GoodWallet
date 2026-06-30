"use client"

import { Button, Icon } from "ui"

import styles from "./styles.module.css"
import { useNotifications } from "./useNotifications"

export const Notifications = () => {
  const { notifications, removeNotification } = useNotifications()
  if (!notifications.length) return null

  return (
    <div className={styles.notificationsContainer}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={[
            styles.notificationItem,
            notification.closing && styles.notificationItemExiting,
          ].join(" ")}
        >
          {notification.status === "pending" && (
            <Icon name="BsArrowRepeat" color="main" spin />
          )}

          {notification.status === "success" && (
            <Icon name="BsCheckCircleFill" color="main" />
          )}
          {notification.status === "error" && (
            <Icon name="BsExclamationCircleFill" color="red" />
          )}

          <span className={styles.notificationMessage}>
            {notification.message}
          </span>

          {notification.status !== "pending" ? (
            <Button
              variant="icon"
              icon="BsXCircle"
              size="big"
              onClick={() => removeNotification({ id: notification.id })}
            />
          ) : null}

          <div
            className={[
              notification.autoClose && styles.notificationProgressBar,
            ].join(" ")}
          />
        </div>
      ))}
    </div>
  )
}
