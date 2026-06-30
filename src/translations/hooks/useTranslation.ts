"use client"

import { useParams } from "next/navigation"

import { getLocaleOrDefault, type SupportedLocales } from "../locale"
import da from "../translations/da"
import en from "../translations/en"
import type { TypedTranslations } from "../types"

const translations: Record<SupportedLocales, TypedTranslations> = {
  en: en,
  da: da,
}

export function useTranslation() {
  const params = useParams<{ locale?: string }>()
  const locale = getLocaleOrDefault(params.locale)
  return { locale, translations: translations[locale] }
}
