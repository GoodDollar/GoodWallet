import { Text } from "ui"

import styles from "./Switch.module.css"

export const Switch = ({
  label,
  isOn,
  onToggle,
  isDisabled = false,
}: {
  label: string
  isOn: boolean
  onToggle?: (isOn: boolean) => void
  isDisabled?: boolean
}) => {
  const wrapperClass = isDisabled
    ? isOn
      ? styles.switchWrapperOnDisabled
      : styles.switchWrapperOffDisabled
    : isOn
      ? styles.switchWrapperOn
      : styles.switchWrapperOff

  return (
    <div className={styles.switchContainer}>
      <Text style="14-400" color={isDisabled ? "text-secondary" : "white"}>
        {label}
      </Text>
      <div
        onClick={() => !isDisabled && onToggle?.(!isOn)}
        className={`${styles.switchWrapper} ${wrapperClass}`}
      >
        <div
          className={`${styles.switchKnob} ${isOn ? styles.switchKnobOn : ""}`}
        />
      </div>
    </div>
  )
}
