import { Text } from "ui"

import styles from "./WalletConnectDialog.module.css"

export type Props = {
  title: string
  bodyText: string
}

export const GenericDialog = ({ title, bodyText }: Props) => {
  return (
    <>
      <Text style="24-600" align="center">
        {title}
      </Text>
      <pre className={styles.sessionRequestDetailsData}>{bodyText}</pre>
    </>
  )
}
