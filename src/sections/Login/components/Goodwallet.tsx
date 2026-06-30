"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocalStorageValue } from "@react-hookz/web"
import { Button, Icon } from "ui"

import { useTranslation } from "translations"
import { config } from "@/config"
import { isDeltaMobile } from "@/utils/getClientEnvironment"
import { postMessageToReactNative } from "@/utils/messageReactNative"

import { useDefaultLoginMethod } from "../useDefaultLoginMethod"
import {
  FacebookLoginButton,
  GoogleLoginButton,
  PrivateKeyLoginButton,
  PwdlessLoginButton,
} from "./LoginButton"
import { Onboarding } from "./Onboarding"

export default function LoginDefault() {
  const { translations } = useTranslation()
  const [showOthers, setShowOthers] = useState(false)
  const { defaultLoginMethod } = useDefaultLoginMethod()
  const showWelcomeDialog = useLocalStorageValue<boolean>("ShowWelcomeDialog", {
    defaultValue: true,
  })
  const loginTranslations = translations.login

  const btns = useMemo(() => {
    const { google, facebook, pwless, testLogin } = config.enabledLoginOptions

    const isFacebookDefault = defaultLoginMethod.value === "facebook"
    const isGoogleDefault = defaultLoginMethod.value === "google"
    const isPwlessDefault = defaultLoginMethod.value === "pwless"
    const isTestLoginDefault = defaultLoginMethod.value === "testlogin"

    return [
      {
        method: "facebook",
        element: <FacebookLoginButton isDefault={isFacebookDefault} />,
        isDefault: isFacebookDefault,
        isEnabled: facebook,
      },
      {
        method: "google",
        element: <GoogleLoginButton isDefault={isGoogleDefault} />,
        isDefault: isGoogleDefault,
        isEnabled: google,
      },
      {
        method: "pwless",
        element: <PwdlessLoginButton isDefault={isPwlessDefault} />,
        isDefault: isPwlessDefault,
        isEnabled: pwless,
      },
      {
        method: "testLogin",
        element: (
          <PrivateKeyLoginButton
            isDefault={isTestLoginDefault}
            masterSeed={testLogin.masterSeed}
            userName={testLogin.userName}
            profileImage={testLogin.profileImage}
          />
        ),
        isDefault: isTestLoginDefault,
        isEnabled:
          testLogin.enabled && testLogin.masterSeed && testLogin.userName,
      },
    ]
  }, [defaultLoginMethod.value])

  if (showWelcomeDialog.value)
    return (
      <Onboarding
        close={() => {
          showWelcomeDialog.set(false)
        }}
      />
    )

  return (
    <div className="h-dvh flex flex-col">
      {isDeltaMobile() && (
        <div
          className="cursor-pointer rounded-full fixed right-4 top-4"
          onClick={() =>
            postMessageToReactNative({ type: "EXIT_GOODWALLET_APP" })
          }
        >
          <Icon name="BsXLg" size="big" />
        </div>
      )}

      <div className="flex-1 overflow-hidden m-6">
        <div className="relative min-h-full flex items-center">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-[var(--token-bg)] p-px w-64 h-64 relative -z-9 rounded-full">
              <div
                className="blur-xl absolute -z-10 stick-to-parent rounded-full"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>
          </div>
          <div className="flex flex-col relative z-0 gap-6 w-full">
            <h2 className="mb-6 text-center font-semibold">
              {loginTranslations.signinText}
            </h2>

            {/* Default method */}
            {btns.find((btn) => btn.isEnabled && btn.isDefault)?.element}

            {showOthers &&
              btns
                .filter((btn) => !btn.isDefault && btn.isEnabled)
                .map((btn) => <div key={btn.method}>{btn.element}</div>)}

            {/* Show others */}
            {!showOthers && btns.filter((btn) => btn.isEnabled).length > 1 && (
              <div className="animate-bounce animation-delay-5s">
                <Button
                  variant="outlined"
                  full
                  text="Other sign in options ▼"
                  onClick={() => setShowOthers(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 mx-6 pb-6 pt-4 flex justify-center">
        <h6 className="text-center max-w-[300px]">
          {loginTranslations.legalText.preText}{" "}
          <Link
            prefetch={false}
            href="https://www.gooddollar.org/terms-of-use"
            target="_blank"
            className="text-white underline bold"
          >
            {loginTranslations.legalText.terms}
          </Link>{" "}
          {loginTranslations.legalText.midText}{" "}
          <Link
            prefetch={false}
            href="https://www.gooddollar.org/privacy-policy"
            target="_blank"
            className="text-white underline"
          >
            {loginTranslations.legalText.privacy}
          </Link>
        </h6>
      </div>
    </div>
  )
}
