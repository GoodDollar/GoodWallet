import InstallApp from "@/components/InstallApp/InstallApp"

import { WalletConnectDialog } from "../WalletConnect/components/WalletConnectDialog/WalletConnectDialog"
import TabSection from "./components/TabSection"
import WalletSection from "./components/WalletSection"

export default function HomeView({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-dvh overflow-y-scroll no-scrollbar"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <WalletSection>{children}</WalletSection>
      <TabSection />
      <InstallApp />
      <WalletConnectDialog />
    </div>
  )
}
