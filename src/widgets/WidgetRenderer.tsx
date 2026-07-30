"use client"

import { ReactWidgetHost } from "./hosts/ReactWidgetHost"
import { WebComponentWidgetHost } from "./hosts/WebComponentWidgetHost"
import type { WidgetHostProps } from "./hostTypes"
import type { RegisteredWidget } from "./registry"

export const WidgetRenderer = ({
  widget,
  ...hostProps
}: WidgetHostProps & {
  widget: RegisteredWidget
}) => {
  if (widget.integrationMode === "react") {
    return (
      <ReactWidgetHost
        load={widget.entry.load}
        exportName={widget.entry.exportName}
        {...hostProps}
      />
    )
  }

  return (
    <WebComponentWidgetHost
      load={widget.entry.load}
      tagName={widget.entry.tagName}
      {...hostProps}
    />
  )
}
