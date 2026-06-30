import type React from "react"
import { useState } from "react"
import { useIntervalEffect } from "@react-hookz/web"

import { zeroPad } from "@/components/Utils/format"

interface CountdownProps {
  nextClaim: Date
}

const getTimeLeft = (nextClaim: Date) =>
  Math.floor((nextClaim.getTime() - Date.now()) / 1000)

const Countdown: React.FC<CountdownProps> = ({ nextClaim }) => {
  const [timeLeft, setTimeLeft] = useState<number>(getTimeLeft(nextClaim))

  //Re-set timeLeft every 250ms
  useIntervalEffect(() => {
    setTimeLeft(getTimeLeft(nextClaim))
  }, 250)

  function convertSecondsToTime(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds - hours * 3600) / 60)
    const seconds = totalSeconds - hours * 3600 - minutes * 60

    return `${zeroPad(hours)}:${zeroPad(minutes)}:${zeroPad(seconds)}`
  }

  return convertSecondsToTime(timeLeft < 0 ? 0 : timeLeft)
}

export default Countdown
