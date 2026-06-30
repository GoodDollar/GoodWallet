import HomeView from "@/sections/Home/HomeView"

// Force static generation for this layout
export const dynamic = "force-static"

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <HomeView>{children}</HomeView>
}
