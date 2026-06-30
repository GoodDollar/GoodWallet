const PROMO_WELCOME_REWARD_STORAGE_KEY = "PROMO_WELCOME_REWARD_ELIGIBILITY"
let isEligible: boolean | undefined

export const setIsEligibleForWelcomeReward = (value: boolean) => {
  isEligible = value
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(
      PROMO_WELCOME_REWARD_STORAGE_KEY,
      JSON.stringify(value),
    )
  }
}

export const isEligibleForWelcomeReward = () => {
  if (isEligible === undefined) {
    if (typeof localStorage === "undefined") {
      return false
    }
    const value = sessionStorage.getItem(PROMO_WELCOME_REWARD_STORAGE_KEY)
    isEligible = value ? value === "true" : false
  }
  return isEligible
}
