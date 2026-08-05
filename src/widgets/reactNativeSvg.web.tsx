import {
  type ComponentPropsWithoutRef,
  createElement,
  type ElementType,
  forwardRef,
} from "react"

type SvgProps = ComponentPropsWithoutRef<"svg"> & {
  size?: number | string
  color?: string
}

const primitive = (element: ElementType) =>
  forwardRef<SVGElement, Record<string, unknown>>((props, ref) =>
    createElement(element, { ...props, ref }),
  )

export const Svg = forwardRef<SVGSVGElement, SvgProps>(
  ({ size, color, ...props }, ref) =>
    createElement("svg", {
      ...props,
      ref,
      width: props.width ?? size,
      height: props.height ?? size,
      color,
      xmlns: "http://www.w3.org/2000/svg",
    }),
)

export const Path = primitive("path")
export const Circle = primitive("circle")
export const Ellipse = primitive("ellipse")
export const Line = primitive("line")
export const Polyline = primitive("polyline")
export const Polygon = primitive("polygon")
export const Rect = primitive("rect")
export const G = primitive("g")
export const Defs = primitive("defs")
export const ClipPath = primitive("clipPath")
export const Mask = primitive("mask")
export const LinearGradient = primitive("linearGradient")
export const RadialGradient = primitive("radialGradient")
export const Stop = primitive("stop")
export const Text = primitive("text")

export default Svg
