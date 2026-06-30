import { Button } from "ui"

interface PositionFiltersProps {
  positionCount: number
  hideDust: boolean
  onToggleHideDust: () => void
}

export default function PositionFilters({
  positionCount,
  hideDust,
  onToggleHideDust,
}: PositionFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold">Positions ({positionCount})</h2>
      <Button
        onClick={onToggleHideDust}
        variant={hideDust ? "solid" : "outlined"}
        size="small"
        text={hideDust ? "Show All" : "Hide Dust"}
      />
    </div>
  )
}
