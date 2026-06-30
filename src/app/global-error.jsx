"use client"

import { useEffect } from "react"
import Error from "next/error"
import { captureException } from "@sentry/nextjs"

export default function GlobalError({ error }) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <Error />
      </body>
    </html>
  )
}
