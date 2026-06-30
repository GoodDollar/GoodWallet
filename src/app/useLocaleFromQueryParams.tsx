import { useSearchParams } from "next/navigation"

import { getLocaleOrDefault } from "translations"

export const useLocaleFromQueryParams = () => {
  const queryParams = useSearchParams()

  const queryParamsLocale = queryParams.get("lang") // Delta redirects with a "lang" query param
  const locale = getLocaleOrDefault(queryParamsLocale)
  return { locale }
}
