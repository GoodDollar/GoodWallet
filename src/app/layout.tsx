import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import "@/ui/styles.css"

import { Dialog, Toast } from "ui"

import { PreloadResources } from "./preload-resources.tsx"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const viewport: Viewport = {
  themeColor: "#000",
  width: "device-width",
  initialScale: 1,
  userScalable: false,
}

//when changing title or description also update manifest.ts
export const metadata: Metadata = {
  title: "GoodWallet",
  description: "Claim UBI and swap cryptocurrencies with GoodWallet",
  appleWebApp: {
    title: "GoodWallet",
    statusBarStyle: "black",
    capable: true,
    startupImage: "/icons/512.png",
  },
  icons: {
    icon: [
      { url: "/favicon.goodwallet.ico", type: "image/icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/192-padded.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    other: [],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html translate="no" className={inter.variable}>
      <head>
        <link rel="shortcut icon" href="/favicon.goodwallet.ico" />
      </head>
      <body suppressHydrationWarning className="theme-blue">
        {children}
        <Toast />
        <Dialog />
      </body>
    </html>
  )
}

PreloadResources()
