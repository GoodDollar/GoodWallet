import { useCallback, useEffect, useRef, useState } from "react"
import { Button, Icon } from "ui"

import { useTranslation } from "@/translations"

import { useTrading } from "../../providers/TradingProvider"

export default function CreateAccountModal({
  onComplete,
}: {
  onComplete: () => void
}) {
  const [buttonText, setButtonText] = useState("Continue")
  const ref = useRef<HTMLDivElement>(null)
  const {
    tradingSession,
    welcomeLoading,
    currentStep,
    shouldDeriveApiCredentials,
    handleFirstWelcomeStep: handleCreateApiCredentials,
    handleSecondWelcomeStep: handleDeriveApiCredentials,
    handleThirdWelcomeStep: handleDeploySafe,
    handleFourthWelcomeStep: handleAllowTokens,
  } = useTrading()
  const {
    translations: { swap },
  } = useTranslation()

  const handleCreateAccountStep = useCallback(async () => {
    try {
      if (!tradingSession) {
        setButtonText("Loading session")
        return
      }
      if (!tradingSession.hasApiCredentials) {
        if (shouldDeriveApiCredentials) {
          await handleDeriveApiCredentials()
        } else {
          await handleCreateApiCredentials()
        }
      } else if (!tradingSession.isSafeDeployed) {
        await handleDeploySafe()
      } else if (!tradingSession.hasApprovals) {
        await handleAllowTokens()
      }
    } catch (error) {
      console.error(error)
      setButtonText("There was an error, please try again")
    }
  }, [
    tradingSession,
    shouldDeriveApiCredentials,
    handleCreateApiCredentials,
    handleDeriveApiCredentials,
    handleDeploySafe,
    handleAllowTokens,
  ])

  useEffect(() => {
    if (
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApprovals &&
      tradingSession?.hasApiCredentials
    ) {
      setTimeout(() => onComplete(), 2000)
    }
  }, [tradingSession])

  return (
    <div ref={ref} className="flex flex-col gap-6 w-full max-w-sm">
      <div className="flex flex-col gap-1 text-center">
        <h3 className="text-xl font-bold">{swap.welcomeFlow.title}</h3>
        <p className="text-sm text-[var(--grey-3)]">
          {swap.welcomeFlow.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <RowInCreateAccountModal
          stepNumber={1}
          title={swap.welcomeFlow.createAccountStep.title}
          message={swap.welcomeFlow.createAccountStep.subtitle}
          isCompleted={
            shouldDeriveApiCredentials ||
            (tradingSession?.hasApiCredentials ?? false)
          }
          isLoading={currentStep === "authenticating_create" && welcomeLoading}
        />
        {shouldDeriveApiCredentials && (
          <RowInCreateAccountModal
            stepNumber={2}
            title={swap.welcomeFlow.deriveAccountStep.title}
            message={swap.welcomeFlow.deriveAccountStep.subtitle}
            isCompleted={tradingSession?.hasApiCredentials ?? false}
            isLoading={
              currentStep === "authenticating_derive" && welcomeLoading
            }
          />
        )}
        <RowInCreateAccountModal
          stepNumber={shouldDeriveApiCredentials ? 3 : 2}
          title={swap.welcomeFlow.createSafeStep.title}
          message={swap.welcomeFlow.createSafeStep.subtitle}
          isCompleted={tradingSession?.isSafeDeployed ?? false}
          isLoading={currentStep === "deploying" && welcomeLoading}
        />
        <RowInCreateAccountModal
          stepNumber={shouldDeriveApiCredentials ? 4 : 3}
          title={swap.welcomeFlow.allowTokensStep.title}
          message={swap.welcomeFlow.allowTokensStep.subtitle}
          isCompleted={tradingSession?.hasApprovals ?? false}
          isLoading={currentStep === "approvals" && welcomeLoading}
        />
      </div>

      <Button
        disabled={welcomeLoading}
        loading={welcomeLoading}
        onClick={handleCreateAccountStep}
        variant="solid"
        text={buttonText}
        full
      />
    </div>
  )
}

export const RowInCreateAccountModal = ({
  stepNumber,
  title,
  message,
  isCompleted,
  isLoading,
}: {
  stepNumber: number
  title: string
  message: string
  isCompleted: boolean
  isLoading: boolean
}) => {
  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        {isLoading ? (
          <span className="animate-spin">
            <Icon name="BsArrowRepeat" color="main" />
          </span>
        ) : isCompleted ? (
          <Icon name="BsCheckCircleFill" />
        ) : (
          <p className="text-xs text-[var(--grey-3)]">{stepNumber}</p>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-[var(--grey-3)]">{message}</p>
      </div>
    </div>
  )
}
