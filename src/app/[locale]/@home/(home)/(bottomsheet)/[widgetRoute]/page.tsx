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

  return <AuthenticatedWidgetRoute widgetId={widget.widgetId} />
}
