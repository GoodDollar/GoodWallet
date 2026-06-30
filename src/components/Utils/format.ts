export const truncateString = (
  input: string | undefined,
  keepStart = 6,
  keepEnd = 4,
) => {
  if (input === undefined) {
    return ""
  }
  const { length } = input

  return length > keepStart + keepEnd
    ? input.slice(0, keepStart) + "..." + input.slice(input.length - keepEnd)
    : input
}

export const zeroPad = (num: number) => String(num).padStart(2, "0")
