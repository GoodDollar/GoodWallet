import { type ChangeEventHandler, useEffect, useRef, useState } from "react"
import { Icon } from "ui"

export type InputProps = {
  label: string
  value: string
  placeholder?: string
  isValid?: boolean
  isLoadingValidation?: boolean
  defaultIconButton?: React.ReactNode
  translate?: "no"
} & (
  | {
      type: "input"
      onChange?: ChangeEventHandler<HTMLInputElement>
    }
  | {
      type: "textarea"
      onChange?: ChangeEventHandler<HTMLTextAreaElement>
    }
)

export function Input({
  type,
  label,
  value,
  placeholder,
  onChange,
  isValid,
  isLoadingValidation,
  defaultIconButton,
  translate,
}: InputProps) {
  const isDisabled = onChange ? false : true
  const [isFocused, setIsFocused] = useState(false)
  const divRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const handleFocus = () => {
    if (divRef.current && inputRef.current && !isDisabled) {
      inputRef.current.focus()
      setIsFocused(true)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  // Disable focus when clicking outside of the ref div
  useEffect(() => {
    if (!isDisabled) {
      const handleClickOutside = (event: MouseEvent) => {
        if (divRef.current && !divRef.current.contains(event.target as Node)) {
          setIsFocused(false)
        }
      }
      document.addEventListener("click", handleClickOutside)
      return () => {
        document.removeEventListener("click", handleClickOutside)
      }
    }
  }, [isDisabled])

  return (
    <div
      className={`rounded-2xl ${
        isFocused ? "gradient-background" : "border-gray-3 border "
      }`}
      ref={divRef}
      onClick={handleFocus}
    >
      <div
        className={`rounded-2xl flex flex-col gap-4 p-4 bg-[var(--token-bg)] `}
      >
        <div className="font-semibold">{label}</div>
        <div className="flex">
          {type === "input" ? (
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              className="bg-transparent border-none focus:outline-none placeholder:text-gray-5 placeholder:text-sm grow"
              type="text"
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              onBlur={handleBlur}
              disabled={isDisabled}
              translate={translate}
            />
          ) : (
            <textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              cols={40}
              rows={5}
              wrap="hard"
              className="bg-transparent border-none focus:outline-none placeholder:text-gray-5 placeholder:text-xs grow"
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              onBlur={handleBlur}
              disabled={isDisabled}
              translate={translate}
            />
          )}

          {isLoadingValidation && (
            <div className="animate-spin h-[25px] w-[25px] border-t-2 border-b-2 border-purple-500 rounded-full" />
          )}
          {value === "" && defaultIconButton}
          {isValid !== undefined && (
            <span className="ml-auto pl-2">
              {!isLoadingValidation &&
                (isValid ? (
                  <Icon name="BsCheckCircleFill" size="big" color="main" />
                ) : (
                  <Icon name="BsXCircleFill" size="big" color="red" />
                ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
