// /api/airdrop/users

import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { isAddress } from "viem"

import { registerAddressPostAPIKey } from "@/configServerless"

import { airdropDbContext } from "./airdropDbContext"
import { AirdropUserInfoFromClient } from "./types"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = await headers()
    const apiKey = headersList.get("apiKey")

    if (!registerAddressPostAPIKey.apiKey) {
      throw new Error("No API key found in .env")
    }

    if (!apiKey || registerAddressPostAPIKey.apiKey !== apiKey) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userInfo = AirdropUserInfoFromClient.safeParse(body)
    if (!userInfo.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: userInfo.error },
        { status: 400 },
      )
    }
    if (!isAddress(userInfo.data.evmAddress)) {
      throw new Error(`${userInfo.data.evmAddress} is not a valid address`)
    }

    await airdropDbContext.insert(userInfo.data)
    return NextResponse.json({ message: "User added" }, { status: 200 })
  } catch (e: unknown) {
    console.error(e)
    return NextResponse.json(
      { message: "Failed to process request" },
      { status: 500 },
    )
  }
}
