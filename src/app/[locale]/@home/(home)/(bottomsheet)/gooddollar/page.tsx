import GoodDollarSplashView from "@/sections/GoodDollar/GoodDollarSplashView"
import GoodDollarView, {
  type GoodDollarTab,
} from "@/sections/GoodDollar/GoodDollarView"

type GoodDollarPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>
}

const getInitialTab = (
  value: string | string[] | undefined,
): GoodDollarTab | undefined => {
  const tab = Array.isArray(value) ? value[0] : value
  if (tab === "invite") return "inviteRewards"
  if (tab === "claim" || tab === "inviteRewards" || tab === "news") return tab
  return undefined
}

export default async function Page({ searchParams }: GoodDollarPageProps) {
  const { tab } = await searchParams

  return (
    <GoodDollarSplashView>
      <GoodDollarView initialTab={getInitialTab(tab)} />
    </GoodDollarSplashView>
  )
}
