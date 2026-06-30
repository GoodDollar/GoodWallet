import {
  MAX_PRICE_CENTS,
  MIN_PRICE_CENTS,
  MIN_TAKER_ORDER_IN_DOLLAR,
} from "../constants/validation.ts"

export const isValidPriceCents = (cents: number) =>
  !isNaN(cents) && cents >= MIN_PRICE_CENTS && cents <= MAX_PRICE_CENTS

export const isOrderSizeValid = (
  market: "market" | "limit",
  orderSize: number,
  orderMinSize: number,
) =>
  market === "market"
    ? orderSize >= MIN_TAKER_ORDER_IN_DOLLAR
    : orderSize >= orderMinSize

export const isValidDecimalInput = (value: string) =>
  value === "" || /^\d*\.?\d*$/.test(value)

export const isValidCentsInput = (value: string) =>
  value === "" || /^\d{0,2}$/.test(value)
