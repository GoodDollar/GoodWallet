import type { ProposalTypes, SignClientTypes } from "@walletconnect/types"
import { Icon, Text } from "ui"

import { useTranslation } from "translations"
import { AVAILABLE_CHAINS, AVAILABLE_CHAINS_IDS } from "@/chain/chains"
import { ChainIcon } from "@/components/Typo/ChainIcon"
import { truncateString } from "@/components/Utils/format"
import { type Addresses, useSessionContext } from "@/login"

import { getInternalChainId } from "../../utils/HelperUtils"
import { SessionsHeader } from "../SessionsHeader/SessionsHeader"
import { getIcon } from "./utils"
import styles from "./WalletConnectDialog.module.css"

export type Props = {
  sessionProposal: SignClientTypes.EventArguments["session_proposal"]
}

export const extractChainIds = (
  nameSpace:
    | ProposalTypes.OptionalNamespaces
    | ProposalTypes.RequiredNamespaces,
) =>
  Object.entries(nameSpace)
    .flatMap(([, required]) => {
      if (!required.chains) {
        return undefined
      }
      return required.chains.map((chain) => {
        try {
          return getInternalChainId(chain)
        } catch {
          return undefined
        }
      })
    })
    .filter((c) => c !== undefined)

const getTruncatedAddressForChainId = (
  chainId: number,
  addresses: Addresses | undefined,
) => {
  const chain = AVAILABLE_CHAINS.get(chainId)
  return truncateString(chain && addresses?.get(chain.family))
}

export const SessionProposalDialog = ({ sessionProposal }: Props) => {
  const { translations } = useTranslation()
  const { icons, url, name } = sessionProposal.params.proposer.metadata
  const icon = getIcon(url, icons)

  const { addresses } = useSessionContext()

  const requiredChainIds: number[] = extractChainIds(
    sessionProposal.params.requiredNamespaces,
  )
  const optionalChainIds: number[] = extractChainIds(
    sessionProposal.params.optionalNamespaces,
  ).filter((chainId) => AVAILABLE_CHAINS_IDS.includes(chainId))

  const listOfChainIds = [...requiredChainIds, ...optionalChainIds]

  return (
    <div className={styles.sessionProposalContent}>
      <SessionsHeader
        icon={icon}
        name={name}
        url={url}
        status={translations.walletConnect.readyToConnectStatus}
      />

      {listOfChainIds.length ? (
        <div className={styles.accountsBox}>
          <div className={styles.accountsRow}>
            <Text style="14-400" color="text-secondary">
              Accounts
            </Text>
            <Text style="14-400" color="text-secondary">
              Chains
            </Text>
          </div>

          {listOfChainIds.map((chainId) => (
            <div className={styles.accountsRow} key={chainId}>
              <Text style="14-400" translate="no">
                {getTruncatedAddressForChainId(chainId, addresses)}
              </Text>
              <Text style="14-400">
                {AVAILABLE_CHAINS.get(chainId)?.name ?? chainId}
                {AVAILABLE_CHAINS.has(chainId) ? (
                  <ChainIcon chainId={chainId} />
                ) : (
                  <Icon name="BsExclamationCircleFill" color="red" />
                )}
              </Text>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
