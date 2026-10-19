import { NextResponse } from "next/server"

import { newVercelConfig } from "@/configServerless"

export const dynamic = "force-dynamic"

const headers = {
  headers: {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  },
}

export function GET() {
  try {
    return NextResponse.json(
      {
        version: newVercelConfig.currentCommitGitSha,
      },
      {
        ...headers,
        status: 200,
      },
    )
  } catch (error) {
    return NextResponse.json({
      message: "Failed to process request",
      error: error,
    })
  }
}
