"use client"

import { useEffect, useRef, useState } from "react"

export function useDrawerClose(open: boolean, onClose: () => void) {
  const [visible, setVisible] = useState(open)
  const closingRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // sets closing attributes on both nodes, guarded against double-fire
  const triggerClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    panelRef.current?.toggleAttribute("closing", true)
    backdropRef.current?.toggleAttribute("closing", true)
  }

  useEffect(() => {
    if (open) {
      closingRef.current = false
      panelRef.current?.removeAttribute("closing")
      backdropRef.current?.removeAttribute("closing")
      setVisible(true)
    } else {
      triggerClose()
    }
  }, [open, triggerClose])

  // scroll lock + Escape key
  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = "hidden"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [visible, triggerClose])

  // unmounts after close animation finishes
  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (e.currentTarget !== e.target) return
    if (closingRef.current) {
      setVisible(false)
      onClose()
    }
  }

  // drag-to-dismiss
  const onPointerDown = (e: React.PointerEvent) => {
    const panel = panelRef.current
    if (!panel) return

    const target = e.target as HTMLElement
    target.setPointerCapture(e.pointerId)
    const startY = e.clientY
    const visibleHeight = panel.getBoundingClientRect().height
    const controller = new AbortController()
    const { signal } = controller

    const snapBack = () => {
      panel.removeAttribute("dragging")
      panel.style.setProperty("--drag", "0px")
    }

    target.addEventListener(
      "pointermove",
      (ev: PointerEvent) => {
        const dragY = Math.max(0, ev.clientY - startY)
        panel.toggleAttribute("dragging", true)
        panel.style.setProperty("--drag", dragY + "px")
      },
      { signal },
    )

    target.addEventListener(
      "pointerup",
      (ev: PointerEvent) => {
        controller.abort()
        if (ev.clientY - startY > visibleHeight * 0.2) {
          panel.removeAttribute("dragging")
          triggerClose()
        } else {
          snapBack()
        }
      },
      { signal },
    )

    target.addEventListener(
      "pointercancel",
      () => {
        controller.abort()
        snapBack()
      },
      { signal },
    )

    panel.style.setProperty("--drag", "0px")
  }

  return {
    visible,
    panelRef,
    backdropRef,
    onPointerDown,
    onAnimationEnd,
    triggerClose,
  }
}
