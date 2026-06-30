"use client"

import type { ReactNode } from "react"

import styles from "./Drawer.module.css"
import { useDrawerClose } from "./useDrawerClose"

export function Drawer({
  open,
  onClose,
  children,
  height,
}: {
  open: boolean
  onClose: () => void
  children?: ReactNode
  height?: "half" | "full"
}) {
  const {
    visible,
    panelRef,
    backdropRef,
    onPointerDown,
    onAnimationEnd,
    triggerClose,
  } = useDrawerClose(open, onClose)

  if (!visible) return null

  return (
    <div ref={backdropRef} className={styles.backdrop} onClick={triggerClose}>
      <div
        ref={panelRef}
        className={[styles.panel, height && styles[`height-${height}`]]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onAnimationEnd={onAnimationEnd}
      >
        <div className={styles.grabHandle} />
        <div
          className={styles.inner}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
