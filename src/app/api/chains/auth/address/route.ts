import { type NextRequest, NextResponse } from "next/server"
import z from "zod"

import { OwnershipScope, ownershipMessage } from "../../ownershipProtocol"
import { verifyOwnershipSignature } from "../../ownershipSignature"
import {
  getAddressSessionCookieName,
  isOwnershipOrigin,
  issuePowChallenge,
  issuePowSession,
  OwnershipOriginError,
  verifyPowSolution,
} from "../../powSession"

const VerifySchema = OwnershipScope.extend({
  challenge: z.string().min(1).max(2048),
  nonce: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  signature: z.string().min(1).max(300),
  publicKey: z.string().max(130).optional(),
})

const noStore = { "Cache-Control": "private, no-store" }

function getAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  return origin && isOwnershipOrigin(origin) ? origin : null
}

export async function GET(request: NextRequest) {
  try {
    const { family, address } = OwnershipScope.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    const challenge = await issuePowChallenge(
      family,
      address,
      request.nextUrl.searchParams.get("origin"),
    )

    return NextResponse.json(challenge, { status: 200, headers: noStore })
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to issue ownership challenge",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof OwnershipOriginError
            ? 400
            : 503,
        headers: noStore,
      },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = getAllowedOrigin(request)
    if (!origin)
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403, headers: noStore },
      )
    const text = await request.text()
    if (text.length > 4096)
      return NextResponse.json(
        { message: "Payload too large" },
        { status: 413, headers: noStore },
      )
    const parsedBody = VerifySchema.parse(JSON.parse(text))
    const isValid = await verifyPowSolution(
      parsedBody.family,
      parsedBody.address,
      parsedBody.challenge,
      parsedBody.nonce,
      origin,
    )

    if (
      !isValid ||
      !(await verifyOwnershipSignature(
        parsedBody.family,
        parsedBody.address,
        ownershipMessage(parsedBody.challenge),
        parsedBody.signature,
        parsedBody.publicKey,
      ))
    ) {
      return NextResponse.json(
        { message: "Invalid ownership proof" },
        { status: 401, headers: noStore },
      )
    }

    const session = await issuePowSession(parsedBody.challenge)
    const cookieName = await getAddressSessionCookieName(
      parsedBody.family,
      parsedBody.address,
    )
    const response = NextResponse.json(
      { ok: true, expiresAt: session.expiresAt },
      { status: 200, headers: noStore },
    )

    response.cookies.set({
      name: cookieName,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/chains",
      expires: new Date(session.expiresAt),
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to create address session",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
        headers: noStore,
      },
    )
  }
}
