"use client"

import { BsLink45Deg, BsPlusCircle } from "react-icons/bs"
import { Icon, type IconName } from "ui"

export type RoundButtonProps = {
  onClick?: () => void
  buttonType: RoundButtonType
  text?: string
  fill?: boolean
}

export const enum RoundButtonType {
  Fund,
  Send,
  Receive,
  GoodDollar,
  Swap,
  WalletConnect,
  Predictions,
}

const buttonIcons: Record<RoundButtonType, IconName> = {
  [RoundButtonType.Fund]: "Cash",
  [RoundButtonType.Send]: "ArrowUpAlt",
  [RoundButtonType.Receive]: "ArrowDownAlt",
  [RoundButtonType.GoodDollar]: "goodDollarLogo",
  [RoundButtonType.Swap]: "Swap",
  [RoundButtonType.WalletConnect]: "walletConnectLogo",
  [RoundButtonType.Predictions]: "Predictions",
}

export const RoundButton = ({
  buttonType,
  onClick,
  text,
  fill = false,
}: RoundButtonProps) => {
  return (
    <div
      className="flex flex-col items-center gap-2 max-w-[60px] select-none cursor-pointer"
      onClick={onClick}
    >
      <div className="rounded-full p-px gradient-background">
        <div className="flex aspect-square w-14 h-14 p-4 rounded-full justify-center items-center bg-[var(--token-bg)] btn-circle relative">
          <Icon name={buttonIcons[buttonType]} size="big" color="white" />

          {fill && buttonType === RoundButtonType.WalletConnect ? (
            <BsLink45Deg
              className="absolute bottom-0 right-0 text-white bg-[#1884FF] rounded"
              stroke="white"
              strokeWidth={3}
              size={20}
              style={{ borderRadius: "50%", padding: "3px" }}
            />
          ) : null}
          {fill && buttonType === RoundButtonType.GoodDollar ? (
            <BsPlusCircle
              className="absolute bottom-0 right-0 text-white bg-[#1884FF] rounded"
              stroke="white"
              strokeWidth={2}
              size={20}
              style={{ borderRadius: "50%", padding: "3px" }}
            />
          ) : null}
        </div>
      </div>
      <h6 className="text-white text-[11px] leading-4 text-center">{text}</h6>
    </div>
  )
}
