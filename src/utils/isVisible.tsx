import { type RefObject, useEffect, useState } from "react"

export default function useInViewport(ref: RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  return isVisible
}
