// /api/tokens/[address]/[chainId]/logo

import { type NextRequest, NextResponse } from "next/server"

import { dbContext } from "../../../dbContext"
import { FALLBACK_IMAGE_BASE64 } from "./fallbackLogoBase64"

export const dynamic = "force-static"
export const revalidate = 604_800 // 7 days

const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
  },
}

const base64Data = FALLBACK_IMAGE_BASE64.split(";base64,").pop()
const fallbackImageBuffer = Buffer.from(base64Data || "", "base64")

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ address: string; chainId: string }>
  },
) {
  const serveFallback = async () => {
    try {
      return new NextResponse(fallbackImageBuffer, {
        status: 200,
        headers: {
          ...headers.headers,
          "Content-Type": "image/png",
          "Content-Length": fallbackImageBuffer.length.toString(),
        },
      })
    } catch (_e) {
      return new NextResponse("Internal server error", { status: 500 })
    }
  }

  try {
    const { address, chainId } = await context.params

    if (!chainId || !address) {
      return serveFallback()
    }

    const src = (
      await dbContext.getToken(Number(chainId), address.toLowerCase())
    ).logoURI

    if (!src) {
      return serveFallback()
    }

    return NextResponse.redirect(src, { ...headers, status: 307 })
  } catch (_e: unknown) {
    console.log(_e)
    return serveFallback()
  }
}
