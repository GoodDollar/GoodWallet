import Link from "next/link"
import { Button } from "ui"

import { useTranslation } from "translations"

type RequireWhitelistProps = {
  onWhitelist: () => void
}

export const RequireWhitelist = ({ onWhitelist }: RequireWhitelistProps) => {
  const { translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar

  return (
    <div className="flex flex-col py-48 w-full px-8 text-center gap-6">
      <h1 className="text-3xl font-semibold">
        {goodDollarTranslations.whitelistRequired}
      </h1>
      <span>{goodDollarTranslations.faceVerificationRequired} </span>
      <Button
        variant="solid"
        full
        text={goodDollarTranslations.verify}
        onClick={onWhitelist}
      />
      <span>
        {goodDollarTranslations.privacyDisclaimer}
        <Link href="https://www.facetec.com/#page-blk-security" target="_blank">
          <u> {goodDollarTranslations.learnMore}</u>
        </Link>
      </span>
    </div>
  )
}
