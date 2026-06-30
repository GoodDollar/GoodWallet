import { Button } from "ui"

export default function CloseDialogButton({
  onClick,
}: {
  onClick: () => void
}) {
  return <Button variant="icon" icon="BsXLg" size="big" onClick={onClick} />
}
