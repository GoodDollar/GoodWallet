import { Icon, Text } from "ui"

import { useTranslation } from "translations"

import styles from "./WalletConnectDialog.module.css"

export type Props = {
  errorText: string
}

export const ErrorDialog = ({ errorText }: Props) => {
  const { translations } = useTranslation()
  return (
    <>
      <div className="flex items-center gap-2">
        <Icon name="BsExclamationCircleFill" size="big" color="red" />
        <Text style="24-600" color="error" align="center">
          {translations.walletConnect.errorTitle}
        </Text>
      </div>
      <pre className={styles.sessionRequestDetailsData}>{errorText}</pre>
    </>
  )
}
