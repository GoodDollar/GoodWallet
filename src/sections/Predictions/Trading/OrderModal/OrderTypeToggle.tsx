import { Button } from "ui"

interface OrderTypeToggleProps {
  orderType: "market" | "limit"
  onChangeOrderType: (type: "market" | "limit") => void
}

export default function OrderTypeToggle({
  orderType,
  onChangeOrderType,
}: OrderTypeToggleProps) {
  return (
    <div className="mb-4">
      <label
        className="block text-sm text-[var(--grey-3)] mb-2"
        htmlFor="orderType"
      >
        Order Type
      </label>
      <div className="flex gap-2">
        <div style={{ flex: 1 }}>
          <Button
            onClick={() => onChangeOrderType("market")}
            variant={orderType === "market" ? "solid" : "outlined"}
            size="small"
            full
            text="Market"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Button
            onClick={() => onChangeOrderType("limit")}
            variant={orderType === "limit" ? "solid" : "outlined"}
            size="small"
            full
            text="Limit"
          />
        </div>
      </div>
    </div>
  )
}
