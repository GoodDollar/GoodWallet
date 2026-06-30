export const supportedLocales = ["en", "da"] as const
export const localeKey = "locale"

export type SupportedLocales = (typeof supportedLocales)[number]
export const defaultLocale: SupportedLocales = "en"

function isSupportedLocale(locale: string): locale is SupportedLocales {
  return (supportedLocales as ReadonlyArray<string>).includes(locale)
}

export function getLocaleOrDefault(
  locale: string | null | undefined,
): SupportedLocales {
  return locale && isSupportedLocale(locale) ? locale : defaultLocale
}
