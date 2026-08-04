"use client"

import { ReactWidgetHost } from "./hosts/ReactWidgetHost"
import { WebComponentWidgetHost } from "./hosts/WebComponentWidgetHost"
import type { WidgetHostProps } from "./hostTypes"
import { type RegisteredWidget, resolveWidgetIntegrationMode } from "./registry"

/**
 * The single decision point between the two integration modes.
 *
 * Keeping this switch outside individual routes means the same released
 * package can change mode through a reviewed registry edit, without changing
 * provider policy or publishing another widget version.
 */
export const WidgetRenderer = ({
  widget,
  ...hostProps
}: WidgetHostProps & {
  widget: RegisteredWidget
}) => {
  const mode = resolveWidgetIntegrationMode(widget)

  if (mode === "react") {
    return (
      <ReactWidgetHost
        load={widget.entries.react.load}
        exportName={widget.entries.react.exportName}
        {...hostProps}
      />
    )
  }

  return (
    <WebComponentWidgetHost
      load={widget.entries.webComponent.load}
      tagName={widget.entries.webComponent.tagName}
      {...hostProps}
    />
  )
}
