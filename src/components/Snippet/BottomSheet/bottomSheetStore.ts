import { proxy, useSnapshot } from "valtio"

import type { BottomSheetProps } from "@/components/Snippet/BottomSheet/BottomSheet"

export type BottomSheetLayoutProps = Pick<
  BottomSheetProps,
  "title" | "subtitle" | "onBack"
>

const bottomSheetState = proxy<BottomSheetLayoutProps>({
  title: undefined,
  subtitle: undefined,
  onBack: undefined,
})

export const useBottomSheetSnapshot = () => useSnapshot(bottomSheetState)

export const setBottomSheetProps = ({
  title,
  subtitle,
  onBack,
}: BottomSheetLayoutProps) => {
  bottomSheetState.title = title
  bottomSheetState.subtitle = subtitle
  bottomSheetState.onBack = onBack
}
