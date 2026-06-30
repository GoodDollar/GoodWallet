export const isTransactionConfirmed = async (
  txHash: string,
  family: string,
): Promise<boolean> => {
  const confirmationsRequired = 1
  let allowedRetries = 15
  const msBetweenRetries = 30 * 1000
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

  while (allowedRetries > 0) {
    try {
      const res = await fetch(
        `/api/chains/${family}/transactions/${txHash}?verbose=true`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      )
      if (res.ok) {
        const parsedResponse = await res.json()
        if (
          typeof parsedResponse.confirmations === "number" &&
          parsedResponse.confirmations >= confirmationsRequired
        ) {
          return true
        }
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("No such mempool or blockchain transaction")
      ) {
        // do nothing and shallow the error
      } else {
        console.error(error)
      }
    }
    await delay(msBetweenRetries)
    allowedRetries -= 1
  }

  return false
}
