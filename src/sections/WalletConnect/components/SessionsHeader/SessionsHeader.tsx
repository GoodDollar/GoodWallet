import Image from "next/image"
import { Icon, Text } from "ui"

import { useTranslation } from "translations"

import style from "./SessionsHeader.module.css"

export const SessionsHeader = (props: {
  icon: string
  name?: string
  url?: string
  status?: string
}) => {
  const { translations } = useTranslation()

  return (
    <div className={style.sessionHeaderContainer}>
      {props.icon ? (
        <Image
          src={props.icon}
          alt="icon"
          width={64}
          height={64}
          className={style.sessionHeaderImage}
        />
      ) : (
        <Icon name="Questionmark" size="big" />
      )}
      <div style={{ marginBottom: "8px" }}>
        <Text style="24-600" align="center">
          {props?.name}
        </Text>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <Text style="14-400" color="text-secondary">
          <Icon name="BsGlobe" color="main" />
          {props?.url}
        </Text>
      </div>

      <Text style="20-600" color="brand">
        {props.status ?? (
          <>
            {translations.walletConnect.connectedStatus}
            <Icon name="BsCheckCircleFill" color="inherit" />
          </>
        )}
      </Text>
    </div>
  )
}
