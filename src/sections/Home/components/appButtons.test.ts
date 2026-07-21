import { describe, expect, it } from "vitest"

import { partitionAppButtons } from "./appButtons"

describe("partitionAppButtons", () => {
  it("keeps up to seven app buttons on the home screen", () => {
    const appButtons = Array.from({ length: 7 }, (_, index) => index)

    expect(partitionAppButtons(appButtons)).toEqual({
      visible: appButtons,
      overflow: [],
    })
  })

  it("moves app buttons after the seventh into the more drawer", () => {
    const appButtons = Array.from({ length: 8 }, (_, index) => index)

    expect(partitionAppButtons(appButtons)).toEqual({
      visible: appButtons.slice(0, 7),
      overflow: appButtons.slice(7),
    })
  })
})
