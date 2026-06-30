"use client"

import type { FC } from "react"
import { Button } from "ui"

import { localeKey, useTranslation } from "translations"
import { config } from "@/config"
import {
  Captcha,
  usePKeyLogin,
  useTriggerTorusAggregateLogin,
  useTriggerTorusLogin,
} from "@/login"

const { env, torus } = config
const { network, web3AuthClientId, providers, captchaKey } = torus

const saveLocaleToSession = (locale: string) => {
  window.sessionStorage.setItem(localeKey, locale)
}

export const GoogleLoginButton: FC<{ isDefault?: boolean }> = ({
  isDefault,
}) => {
  const { locale, translations } = useTranslation()
  const onTriggerLogin = useTriggerTorusAggregateLogin(
    network,
    web3AuthClientId,
    providers.google,
  )

  return (
    <Button
      variant={isDefault ? "solid" : "outlined"}
      full
      icon="BsGoogle"
      text={translations.login.google}
      onClick={() => {
        saveLocaleToSession(locale)
        onTriggerLogin()
      }}
    />
  )
}

export const FacebookLoginButton: FC<{ isDefault?: boolean }> = ({
  isDefault,
}) => {
  const { locale, translations } = useTranslation()
  const onTriggerLogin = useTriggerTorusLogin(
    network,
    web3AuthClientId,
    providers.facebook,
  )

  return (
    <Button
      variant={isDefault ? "solid" : "outlined"}
      full
      icon="BsFacebook"
      text={translations.login.facebook}
      onClick={() => {
        saveLocaleToSession(locale)
        onTriggerLogin()
      }}
    />
  )
}

export const PwdlessLoginButton: FC<{ isDefault?: boolean }> = ({
  isDefault,
}) => {
  const { locale, translations } = useTranslation()
  const onCaptchaVerified = useTriggerTorusLogin(
    network,
    web3AuthClientId,
    providers.pwdless,
  )

  return (
    <div>
      <Captcha env={env} captchaKey={captchaKey} onVerified={onCaptchaVerified}>
        {({ launchCaptcha }) => {
          return (
            <Button
              variant={isDefault ? "solid" : "outlined"}
              full
              icon="BsChatTextFill"
              text={translations.login.pwdless}
              onClick={() => {
                saveLocaleToSession(locale)
                launchCaptcha()
              }}
            />
          )
        }}
      </Captcha>
    </div>
  )
}

export const PrivateKeyLoginButton: FC<{
  isDefault?: boolean
  masterSeed: string
  userName: string
  profileImage: string
}> = ({ isDefault, masterSeed, userName, profileImage }) => {
  const onClick = usePKeyLogin(masterSeed, userName, profileImage)

  return (
    <Button
      variant={isDefault ? "solid" : "outlined"}
      full
      text={userName}
      onClick={onClick}
    />
  )
}
