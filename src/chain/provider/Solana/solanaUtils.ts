import type { Commitment, Signature, SolanaClient } from "gill"

export async function confirmTransaction(
  client: SolanaClient,
  signature: Signature,
  desiredConfirmationStatus: Commitment = "confirmed",
  timeout: number = 30000,
  pollInterval: number = 1000,
  searchTransactionHistory: boolean = false,
) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const { value: statuses } = await client.rpc
      .getSignatureStatuses([signature], { searchTransactionHistory })
      .send()

    if (!statuses || statuses.length === 0) {
      throw new Error("Failed to get signature status")
    }

    const status = statuses[0]

    if (status === null) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      continue
    }

    if (status.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
    }

    if (
      status.confirmationStatus &&
      status.confirmationStatus === desiredConfirmationStatus
    ) {
      return status
    }

    if (status.confirmationStatus === "finalized") {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error(`Transaction confirmation timeout after ${timeout}ms`)
}
