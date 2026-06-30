import { useEffect, useRef, useState } from "react"

// No-op for most boxes; drag handlers and scroll-into-view only activate when scroll/selected props are set
export function useBoxScroll(
  scroll: boolean | undefined,
  vertical: boolean | undefined,
  selected: boolean | undefined,
) {
  const isHorizontal = scroll && !vertical
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollStart: 0,
    didDrag: false,
  })
  const mounted = useRef(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (selected)
      ref.current?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      })
  }, [selected])

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollStart: isHorizontal
        ? e.currentTarget.scrollLeft
        : e.currentTarget.scrollTop,
      didDrag: false,
    }
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const delta = isHorizontal
      ? e.clientX - drag.current.startX
      : e.clientY - drag.current.startY
    if (Math.abs(delta) > 3) {
      drag.current.didDrag = true
      setDragging(true)
    }
    if (isHorizontal)
      e.currentTarget.scrollLeft = drag.current.scrollStart - delta
    else e.currentTarget.scrollTop = drag.current.scrollStart - delta
  }

  const stopDrag = () => {
    drag.current.active = false
    setDragging(false)
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.didDrag) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.didDrag = false
    }
  }

  return {
    ref,
    dragging,
    dragHandlers: scroll
      ? {
          onMouseDown,
          onMouseMove,
          onMouseUp: stopDrag,
          onMouseLeave: stopDrag,
          onDragStart: (e: React.MouseEvent) => e.preventDefault(),
          onClickCapture,
        }
      : {},
  }
}
