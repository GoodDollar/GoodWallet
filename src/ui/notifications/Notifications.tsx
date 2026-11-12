"use client"

import type { ReactElement } from "react"
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
            // Rich content grows with its text instead of the fixed single-line height
            notification.content && styles.notificationItemRich,
          ].join(" ")}
        >
          {notification.status === "pending" && (
            <Icon name="BsArrowRepeat" color="main" spin />
          )}

          {notification.status === "success" && (
            <Icon name="BsCheckCircleFill" color="main" />
          )}
          {notification.status === "error" && (
            // Multi-line notices pair the larger status icon with the big X button
            <Icon
              name="BsExclamationCircleFill"
              color="red"
              size={notification.content ? "big" : undefined}
            />
          )}

          <div className={styles.notificationMessage}>
            {/* valtio snapshots type the ref'd element as readonly; it is the original element */}
            {(notification.content as ReactElement | undefined) ??
              notification.message}
          </div>

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
