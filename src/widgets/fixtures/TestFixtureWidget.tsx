"use client"

import type { WidgetHostProps } from "../hostTypes"

export const goodWidgetMetadata = {
  packageName: "@goodwidget/test-fixture",
  packageVersion: "0.0.0",
} as const

export const TestFixtureWidget = (_props: WidgetHostProps) => {
  return (
    <div data-testid="test-fixture-widget" className="p-4 text-white">
      Test Fixture Widget
    </div>
  )
}
