import { notFound } from "next/navigation"

import { AuthenticatedWidgetRoute } from "@/widgets/AuthenticatedWidgetRoute"
import { getWidgetByRoute } from "@/widgets/registry"

/**
 * Static core routes take precedence; this fallback can mount only a reviewed
 * registry route and treats every other unknown bottom-sheet URL as not found.
 */
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
