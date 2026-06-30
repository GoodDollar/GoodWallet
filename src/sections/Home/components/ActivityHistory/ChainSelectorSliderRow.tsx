import { Icon } from "ui"

import { getChainName } from "@/chain/chains"
import { ChainIcon } from "@/components/Typo/ChainIcon"

export const ChainSelectorSliderRow = ({
  chainId,
  onClick,
  selected,
}: {
  chainId: number | null
  onClick: () => void
  selected: boolean
}) => {
  const chainName = chainId ? getChainName(chainId) : "All tokens"
  return (
    <div
      className="flex items-center justify-between gap-x-6 py-3 h-[50px] cursor-pointer w-full border-b border-[#2a2a2a] last:border-b-0"
      onClick={onClick}
    >
      <div className="flex gap-x-3 items-center">
        {ChainIcon({ chainId, chainName })}
        <p>{chainName}</p>
      </div>
      <div className="flex flex-wrap gap-x-2 items-center">
        {selected && <Icon name="BsCheckLg" size="big" />}
      </div>
    </div>
  )
}
