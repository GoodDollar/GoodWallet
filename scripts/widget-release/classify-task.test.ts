import { describe, expect, it } from "vitest"

import { classifyIntegrationTask } from "./classify-task.mjs"

const packageName = "@goodwidget/goodreserve-widget"
const registrySource = `packageName: "${packageName}"`

describe("Copilot integration task classification", () => {
  it("classifies an absent registry entry as a full new integration", () => {
    expect(
      classifyIntegrationTask({
        registrySource: "",
        packageName,
        installedVersion: undefined,
        targetVersion: "1.0.0",
      }),
    ).toEqual({
      alreadyIntegrated: false,
      integrationTaskType: "new",
    })
  })

  it("classifies a registered older version as a narrow update", () => {
    expect(
      classifyIntegrationTask({
        registrySource,
        packageName,
        installedVersion: "1.0.0",
        targetVersion: "1.0.1",
      }),
    ).toEqual({
      alreadyIntegrated: false,
      integrationTaskType: "update",
    })
  })

  it("stops when the exact registered dependency is already integrated", () => {
    expect(
      classifyIntegrationTask({
        registrySource,
        packageName,
        installedVersion: "1.0.1",
        targetVersion: "1.0.1",
      }),
    ).toEqual({
      alreadyIntegrated: true,
      integrationTaskType: "update",
    })
  })
})
