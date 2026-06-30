import { useTranslation } from "translations"

export const Claimed = () => {
  const { translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar

  return (
    <>
      <div className="text-2xl text-center font-semibold">
        <div>{goodDollarTranslations.justALittleLonger}</div>
        <div>{goodDollarTranslations.moreG$Coming}</div>
      </div>
    </>
  )
}
