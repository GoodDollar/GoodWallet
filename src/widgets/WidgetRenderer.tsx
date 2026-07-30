"use client"

import { ReactWidgetHost } from "./hosts/ReactWidgetHost"
import { WebComponentWidgetHost } from "./hosts/WebComponentWidgetHost"
import type { WidgetHostProps } from "./hostTypes"
import { type RegisteredWidget, resolveWidgetIntegrationMode } from "./registry"

/**
 * This is the sole integration-mode decision point for every widget route.
 */
export const WidgetRenderer = ({
  widget,
  ...hostProps
}: WidgetHostProps & {
  widget: RegisteredWidget
}) => {
  if (resolveWidgetIntegrationMode(widget) === "react") {
    return (
      <ReactWidgetHost
        key={widget.widgetId}
        load={widget.entries.react.load}
        exportName={widget.entries.react.exportName}
        {...hostProps}
      />
    )
  }

  return (
    <WebComponentWidgetHost
      key={widget.widgetId}
      load={widget.entries.webComponent.load}
      tagName={widget.entries.webComponent.tagName}
      {...hostProps}
    />
  )
}
