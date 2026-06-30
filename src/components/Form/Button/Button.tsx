"use client"

import type { ComponentPropsWithoutRef, FC } from "react"
import Image from "next/image"
import { onlyText } from "react-children-utilities"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

export type PrimaryButtonProps = ComponentPropsWithoutRef<"button"> & {
  btnClassName?: string
  btnInnerClassName?: string
  loading?: boolean
}

type IconButtonProps = PrimaryButtonProps & {
  width?: number
  height?: number
  hint?: string
  icon?: React.ComponentProps<typeof Image>["src"]
}

export type ToolbarButtonProps = Omit<IconButtonProps, "className" | "hint">

export const PrimaryButton: FC<PrimaryButtonProps> = ({
  children,
  className,
  btnClassName,
  btnInnerClassName,
  loading,
  ...props
}) => {
  const isGreyedOut = props.disabled && !loading
  const buttonDisabled = props.disabled || loading
  return (
    <div
      className={
        (className ??
          "transition ease-in-out duration-[400ms] flex rounded-full p-px gradient-background") +
        (isGreyedOut ? " grayscale" : "") +
        (props.disabled ? " opacity-40" : "") +
        (loading ? " animate-pulse" : "")
      }
    >
      <button
        {...props}
        disabled={buttonDisabled}
        className={
          btnClassName ?? "rounded-full px-6 w-full bg-dark-1 h-[50px]"
        }
      >
        <div
          className={
            btnInnerClassName ??
            "p-2 grid grid-cols-[1fr_auto_1fr] justify-items-end items-center"
          }
        >
          {loading && (
            <div
              className={`transition ease-in-out duration-[400ms] px-3 ${
                loading ? "opacity-1" : "opacity-0"
              }`}
            >
              <LoadingSpinner size={32} />
            </div>
          )}
          <div
            className={
              "transition ease-in-out duration-[400ms] col-start-2 font-medium text-white leading-loose flex items-center" +
              (loading ? " opacity-40" : "")
            }
          >
            {children}
          </div>
        </div>
      </button>
    </div>
  )
}

const IconButton: FC<IconButtonProps> = ({
  width,
  height,
  icon,
  hint,
  children,
  ...props
}) => (
  <button {...props}>
    {icon && (
      <Image
        src={icon}
        alt={hint ?? onlyText(children)}
        width={width}
        height={height}
      />
    )}
    {children}
  </button>
)

export const ToolbarButton: FC<ToolbarButtonProps> = ({
  children,
  width = 25,
  height = 25,
  ...props
}) => (
  <div>
    <IconButton
      {...props}
      width={width}
      height={height}
      className="flex items-center self-stretch gap-5"
      hint={onlyText(children)}
    >
      <h5 className="font-semibold">{children}</h5>
    </IconButton>
  </div>
)
