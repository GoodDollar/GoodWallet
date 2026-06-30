"use client"

import { useState } from "react"

import { Icon, type IconName } from "../icon/Icon"
import styles from "./Button.module.css"

export const Button = (
  props:
    | {
        variant?: "solid"
        onClick?: () => void
        disabled?: boolean
        text: string
        icon?: IconName
        size?: "small" | "big"
        full?: boolean
        loading?: boolean
        error?: boolean
        color?: "red"
      }
    | {
        variant: "outlined"
        onClick?: () => void
        disabled?: boolean
        text: string
        icon?: IconName
        size?: "small" | "big"
        full?: boolean
        loading?: boolean
        error?: boolean
        color?: "red"
      }
    | {
        variant: "ghost"
        onClick?: () => void
        disabled?: boolean
        text: string
        icon?: IconName
        size?: "small" | "big"
        full?: boolean
        loading?: boolean
        error?: boolean
        color?: "red"
      }
    | {
        variant: "pill"
        onClick?: () => void
        disabled?: boolean
        text?: string
        icon?: IconName
        color?: "main" | "red" | "blue" | "green"
        loading?: boolean
        error?: boolean
        copyValue?: string
      }
    | {
        variant: "icon"
        onClick?: () => void
        disabled?: boolean
        icon: IconName
        size?: "small" | "big" | "larger"
        color?: "main" | "dim" | "red"
      }
    | {
        variant: "text"
        onClick?: () => void
        disabled?: boolean
        text: string
      }
    | {
        variant: "list"
        onClick?: () => void
        disabled?: boolean
        icon: IconName
        text: string
        size?: "small" | "big"
      }
    | {
        variant: "square"
        onClick?: () => void
        disabled?: boolean
        icon: IconName
        copyValue?: string
      },
) => {
  const variant = props.variant ?? "solid"

  const [copied, setCopied] = useState(false)

  switch (variant) {
    /* solid | outlined | ghost ──────────────────────────────────────── */

    case "solid":
    case "outlined":
    case "ghost": {
      const {
        text,
        icon,
        size = "default",
        full,
        loading,
        error,
        color = "default",
      } = props as {
        text: string
        icon?: IconName
        size?: "small" | "big"
        full?: boolean
        loading?: boolean
        error?: boolean
        color?: "red"
      }
      const iconSize = size === "big" ? "big" : undefined

      return (
        <button
          type="button"
          className={[
            styles.button,
            styles[variant],
            styles[size],
            styles[color],
            full && styles.full,
            error && styles.error,
            loading ? styles.loading : !!props.disabled && styles.disabled,
          ]
            // .filter(Boolean) drops `undefined` and `false` so .join(" ") only gets class strings
            .filter(Boolean)
            .join(" ")}
          disabled={!!props.disabled || !!loading}
          onClick={props.onClick}
        >
          {icon && (
            <Icon
              name={icon}
              size={iconSize}
              opacity={text ? "dim" : undefined}
            />
          )}
          {text}
        </button>
      )
    }

    /* pill ──────────────────────────────────────────────────────────── */

    case "pill": {
      const {
        text,
        icon,
        color = "main",
        loading,
        error,
        copyValue,
      } = props as {
        text?: string
        icon?: IconName
        color?: "main" | "red" | "blue" | "green"
        loading?: boolean
        error?: boolean
        copyValue?: string
      }
      const hasTextAndIcon = Boolean(text && icon)
      const isDisabled = !!props.disabled || copied
      const onClick =
        copyValue && !props.disabled
          ? () => {
              navigator.clipboard.writeText(copyValue)
              props.onClick?.()
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }
          : props.onClick

      return (
        <button
          type="button"
          aria-label={text ?? icon}
          className={[
            styles.button,
            styles.pill,
            styles[color],
            error && styles.error,
            loading ? styles.loading : isDisabled && styles.disabled,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={isDisabled || !!loading}
          onClick={onClick}
        >
          <span
            className={[
              styles.pillContent,
              hasTextAndIcon && styles.pillContentWithTextAndIcon,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {text && <span className={styles.pillText}>{text}</span>}
            {icon && (
              <span
                className={styles.pillIcon}
                style={hasTextAndIcon ? { opacity: 0.9 } : undefined}
              >
                <Icon name={icon} color="inherit" />
              </span>
            )}
          </span>
        </button>
      )
    }

    /* icon ─────────────────────────────────────────────────────────── */

    case "icon": {
      const {
        icon,
        size = "default",
        color = "default",
      } = props as {
        icon: IconName
        size?: "small" | "big" | "larger"
        color?: "main" | "dim" | "red"
      }

      return (
        <button
          type="button"
          aria-label={icon}
          className={[
            styles.button,
            styles.icon,
            styles[size],
            styles[color],
            props.disabled && styles.disabled,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!!props.disabled}
          onClick={props.onClick}
        >
          <Icon name={icon} size={size === "default" ? undefined : size} />
        </button>
      )
    }

    /* text ──────────────────────────────────────────────────────────── */

    case "text": {
      const { text } = props as { text: string }

      return (
        <button
          type="button"
          className={[styles.text, props.disabled && styles.disabled]
            .filter(Boolean)
            .join(" ")}
          disabled={!!props.disabled}
          onClick={props.onClick}
        >
          {text}
        </button>
      )
    }

    /* square ─────────────────────────────────────────────────────── */

    case "square": {
      const { icon, copyValue } = props as {
        icon: IconName
        copyValue?: string
      }
      const isDisabled = !!props.disabled || copied
      const displayIcon = copyValue && copied ? "BsCheckLg" : icon
      const onClick =
        copyValue && !props.disabled
          ? () => {
              navigator.clipboard.writeText(copyValue)
              props.onClick?.()
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }
          : props.onClick

      return (
        <button
          type="button"
          aria-label={icon}
          className={[
            styles.button,
            styles.square,
            copied && styles.copied,
            isDisabled && !copied && styles.disabled,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={isDisabled}
          onClick={onClick}
        >
          <Icon name={displayIcon} color={copied ? "main" : undefined} />
        </button>
      )
    }

    /* list ─────────────────────────────────────────────────────────── */

    case "list": {
      const {
        icon,
        text,
        size = "default",
      } = props as {
        icon: IconName
        text: string
        size?: "small" | "big"
      }
      const iconSize = size === "small" ? undefined : "big"

      return (
        <button
          type="button"
          className={[
            styles.list,
            styles[size],
            props.disabled && styles.disabled,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!!props.disabled}
          onClick={props.onClick}
        >
          <span className={styles.listIcon}>
            <Icon name={icon} size={iconSize} color="inherit" />
          </span>
          <span className={styles.listLabel}>{text}</span>
        </button>
      )
    }
  }
}
