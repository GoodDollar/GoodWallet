"use client" // Error boundaries must be Client Components

import { useEffect } from "react"
import { Button } from "ui"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <Button variant="solid" text="Try again" onClick={() => reset()} />
    </div>
  )
}
