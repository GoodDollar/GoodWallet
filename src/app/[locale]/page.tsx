import { supportedLocales } from "translations"

// Force static generation and prevent dynamic params
export const dynamicParams = false
export const dynamic = "force-static"

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }))
}

export default function Page() {
  return <></>
}
