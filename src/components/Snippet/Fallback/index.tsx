import type { FC, PropsWithChildren } from "react"

import { LoadingSpinner } from "../LoadingSpinner"

export type Fallback = PropsWithChildren<{
  showText?: string
  showLoading?: boolean
}>

export const Fallback: FC<Fallback> = ({ showText, showLoading, children }) =>
  showText || showLoading ? (
    <div className="h-full flex flex-col align-middle justify-center text-center items-center">
      {showLoading && <LoadingSpinner />}
      {showText && <div className="text-white">{showText}</div>}
    </div>
  ) : (
    children
  )
