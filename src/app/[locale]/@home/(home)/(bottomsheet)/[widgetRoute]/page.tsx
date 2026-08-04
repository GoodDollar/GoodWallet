import { notFound } from "next/navigation"

import { AuthenticatedWidgetRoute } from "@/widgets/AuthenticatedWidgetRoute"
import { getWidgetByRoute, WIDGETS } from "@/widgets/registry"

export const dynamicParams = false

export function generateStaticParams() {
  return WIDGETS.map((widget) => ({ widgetRoute: widget.routeSlug }))
}

export default async function WidgetRoutePage({
  params,
}: {
  params: Promise<{ widgetRoute: string }>
}) {
  const { widgetRoute } = await params
  const widget = getWidgetByRoute(widgetRoute)
  if (!widget) notFound()

  const backendUrl =
    widget.routeSlug === "ai-credits"
      ? process.env.NEXT_PUBLIC_AI_CREDITS_BACKEND_URL
      : undefined
  const fundingVaultAddress =
    widget.routeSlug === "ai-credits"
      ? process.env.NEXT_PUBLIC_AI_CREDITS_FUNDING_VAULT_ADDRESS
      : undefined

  return (
    <AuthenticatedWidgetRoute
      widgetId={widget.widgetId}
      backendUrl={backendUrl}
      fundingVaultAddress={fundingVaultAddress}
    />
  )
}
