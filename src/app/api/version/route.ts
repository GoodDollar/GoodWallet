import { NextResponse } from "next/server"

import { newVercelConfig } from "@/configServerless"

export const dynamic = "force-static"
export const revalidate = 60 // 1 minutes

const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
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
