import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoodWallet",
    short_name: "GoodWallet",
    description: "Claim UBI and exchange cryptocurrencies with GoodWallet",
    start_url: "/",
    id: "/",
    icons: [
      {
        src: "/icons/192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.webp",
        sizes: "750x1334",
        type: "image/webp",
      },
      {
        src: "/screenshots/exchange.webp",
        sizes: "750x1334",
        type: "image/webp",
      },
      {
        src: "/screenshots/home-wide.webp",
        sizes: "750x1334",
        type: "image/webp",
        form_factor: "wide",
      },
      {
        src: "/screenshots/exchange-wide.webp",
        sizes: "750x1334",
        type: "image/webp",
        form_factor: "wide",
      },
    ],
    theme_color: "#000",
    background_color: "#000",
    display: "standalone",
  }
}
