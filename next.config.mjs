// Injected content via Sentry wizard below
import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  images: {
    minimumCacheTTL: 31536000,
    remotePatterns: [
       {
        protocol: "https",
        hostname: "**.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.gooddollar.org",
        port: "",
        pathname: "/**",
      },
    ],
  },
  redirects: async () => [
    {
      source: "/terms-of-use",
      destination: "https://gooddollar.org/terms-of-use",
      permanent: true,
    },
    {
      source: "/privacy-policy",
      destination: "https://gooddollar.org/privacy-policy",
      permanent: true,
    }
  ], 
  headers: async () => {
    const headers = [
      {
        // Anti-clickjacking: only GoodWallet itself and delta may iframe us.
        // The delta mobile app uses a native WebView (top-level document), which frame-ancestors does not affect.
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://delta.app https://*.delta.app;", 
          },
        ],
      },
      {
        //Allow browsers to cache content from public folder for one week, to cut down on the number of edge requests
        source: "/:all*(.png|.jpg|.jpeg|.gif|.svg|.ico|.webp|.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, must-revalidate",
          },
        ],
      },
    ]
    if (process.env.VERCEL_NO_INDEX === "true") {
      headers.push({
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
        source: '/:path*',
      });
    }
    return headers;
  },
}

const nextConfigWithSentry = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "gooddollar",
  project: process.env.VERCEL_SENTRY_PROJECT_NAME,
  authToken: process.env.VERCEL_SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    automaticVercelMonitors: false,
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true
    }
  }
})

export default nextConfigWithSentry
