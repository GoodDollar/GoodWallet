import React from "react"
import type { Route } from "@lifi/sdk"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCaptureEvent = vi.fn()
const mockMutateBalances = vi.fn()
const mockAddPropagatingTx = vi.fn()
const mockExecuteRoute = vi.fn()

let currentAccountToken = 1
let onImportStarted: (() => void) | undefined
let resolveImport: ((mod: Record<string, unknown>) => void) | undefined

vi.mock("@/config", () => ({
  config: {
    env: "development",
  },
}))

vi.mock("@/analytics/useAnalytics", () => ({
  useAnalytics: () => ({ captureEvent: mockCaptureEvent }),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("valtio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("valtio")>()
  return {
    ...actual,
    useSnapshot: (store: unknown) => store,
  }
})

vi.mock("@/translations/hooks/useTranslation", () => ({
  useTranslation: () => ({
    translations: {
      swap: {
        swapNotification: {
          swapInitiated: (amt: string, sym: string) =>
            `Initiated ${amt} ${sym}`,
          swapSucceeded: (amt: string, sym: string) =>
            `Succeeded ${amt} ${sym}`,
          swapFailed: (amt: string, sym: string) => `Failed ${amt} ${sym}`,
          swapSlow: "Slow",
          userFriendlyErrors: { gasPrecheckFailed: "Gas failed" },
        },
        swapDialog: {
          title: "Swap",
          acceptBtnText: "Accept",
          rejectBtnText: "Reject",
        },
        routesSearchingTag: "Searching",
        routesSelectRouteTag: "Select",
        routesNoRoutesTag: "No routes",
        routesReviewBtn: "Review",
      },
    },
  }),
}))

vi.mock("@/hooks/useTokenBalances", () => ({
  useTokenBalances: () => ({
    mutateBalancesForChain: mockMutateBalances,
    balances: {
      byChain: {
        getNativeBy: () => ({
          amount: "1000",
          decimals: 18,
        }),
      },
    },
    tokens: {
      getNativeBy: () => ({
        decimals: 18,
        symbol: "CELO",
      }),
    },
  }),
}))

vi.mock("../SwapDialog/swapDialogStore", () => ({
  openSwapDialog: vi.fn().mockResolvedValue("accepted"),
}))

vi.mock("ui", () => ({
  Button: (props: Record<string, unknown>) =>
    React.createElement("button", props),
  createToast: () => "toast-1",
  updateToast: vi.fn(),
  toastStore: {},
  Text: () => null,
}))

vi.mock("../SwapDialog/ConfirmSwapDialog", () => ({
  ConfirmSwapDialog: () => null,
}))
vi.mock("../RouteBox/RouteBox", () => ({
  RouteBox: () => null,
}))
vi.mock("../OutOfGasWarn/OutOfGasWarn", () => ({
  OutOfGasWarn: () => null,
}))
vi.mock("@/components/Snippet/LoadingSpinner", () => ({
  LoadingSpinner: () => null,
}))

vi.mock("../../lifiUtils", () => ({
  getPropagatingTxs: () => [
    {
      hash: "0xpropagatinghash",
      chainId: 42220,
      method: "Swap",
      from: "0xfrom",
      to: "0xto",
      tokenAddress: "0xtoken",
      amount: "100",
      timestamp: 1000,
    },
  ],
}))

vi.mock("@/stores/transactionHistoryStore", () => ({
  activityHistoryStore: {
    getCurrentAccountToken: () => currentAccountToken,
    addPropagatingTx: (...args: unknown[]) => mockAddPropagatingTx(...args),
  },
}))

vi.mock("../../lifiStore", () => ({
  lifiState: {
    isInitialized: true,
    client: { dummy: true },
  },
}))

vi.mock("@lifi/sdk", () => {
  onImportStarted?.()
  return new Promise<Record<string, unknown>>((resolve) => {
    resolveImport = resolve
  })
})

const mockRoute: Route = {
  id: "route-1",
  fromChainId: 42220,
  toChainId: 42220,
  fromAmount: "1000000000000000000",
  toAmount: "1000000000000000000",
  toAmountMin: "1000000000000000000",
  fromAmountUSD: "1.0",
  toAmountUSD: "1.0",
  fromToken: {
    address: "0xTokenA",
    chainId: 42220,
    symbol: "G$",
    decimals: 18,
    name: "GoodDollar",
    priceUSD: "1.0",
  },
  toToken: {
    address: "0xTokenB",
    chainId: 42220,
    symbol: "cUSD",
    decimals: 18,
    name: "Celo Dollar",
    priceUSD: "1.0",
  },
  steps: [
    {
      id: "step-1",
      type: "lifi",
      tool: "tool",
      action: {} as unknown as Route["steps"][0]["action"],
      estimate: {
        gasCosts: [],
        feeCosts: [],
      } as unknown as Route["steps"][0]["estimate"],
      execution: {
        status: "DONE",
        process: [],
      },
    } as unknown as Route["steps"][0],
  ],
  tags: [],
  insurance: { state: "NOT_INSURABLE", feeAmountUsd: "0" },
}

vi.mock("swr/immutable", () => ({
  default: () => ({
    data: [mockRoute],
    isValidating: false,
    error: undefined,
  }),
}))

import RouteSlider from "./RouteSlider"

describe("RouteSlider - account token capture guard (B15/R2)", () => {
  const setupDispatcher = () => {
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
          H: unknown
        }
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

    internals.H = {
      useState: (initial: unknown) => {
        const val =
          initial === undefined
            ? mockRoute
            : typeof initial === "function"
              ? (initial as () => unknown)()
              : initial
        return [val, () => {}]
      },
      useCallback: (fn: unknown) => fn,
      useMemo: (fn: () => unknown) => fn(),
      useEffect: () => {},
      useLayoutEffect: () => {},
      useDebugValue: () => {},
      useRef: (initial: unknown) => ({ current: initial }),
      useContext: () => ({}),
      useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) =>
        getSnapshot(),
      useId: () => "id",
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDispatcher()
    currentAccountToken = 1
    mockExecuteRoute.mockResolvedValue({
      ...mockRoute,
      steps: [
        {
          id: "step-1",
          execution: { status: "DONE" },
        },
      ],
    })
  })

  it("aborts execution and does not record propagating tx when account changes while LiFi SDK import is in flight", async () => {
    let importStarted = false
    const importStartedPromise = new Promise<void>((resolve) => {
      onImportStarted = () => {
        importStarted = true
        resolve()
      }
    })

    const element = RouteSlider()
    const children = React.Children.toArray(element.props.children)
    const button = children.find(
      (c) =>
        React.isValidElement(c) &&
        typeof (c.props as Record<string, unknown>)?.onClick === "function",
    ) as React.ReactElement<{ onClick: () => Promise<void> }>

    expect(button).toBeDefined()

    // Account A is active when user clicks swap
    currentAccountToken = 1
    const swapExecutionPromise = button.props.onClick()

    // Wait until executeSelectedRoute has begun awaiting import("@lifi/sdk")
    await importStartedPromise
    expect(importStarted).toBe(true)

    // While @lifi/sdk import is pending, session switches to Account B
    currentAccountToken = 2

    // Now the dynamic import resolves
    resolveImport?.({ executeRoute: mockExecuteRoute })
    await swapExecutionPromise

    // Route must NOT be executed under the wrong account
    expect(mockExecuteRoute).not.toHaveBeenCalled()
    // No propagating tx must be recorded under Account B for Account A's swap
    expect(mockAddPropagatingTx).not.toHaveBeenCalled()
  })

  it("proceeds with execution and records propagating tx when account remains unchanged during import", async () => {
    const element = RouteSlider()
    const children = React.Children.toArray(element.props.children)
    const button = children.find(
      (c) =>
        React.isValidElement(c) &&
        typeof (c.props as Record<string, unknown>)?.onClick === "function",
    ) as React.ReactElement<{ onClick: () => Promise<void> }>

    expect(button).toBeDefined()

    // Account A is active throughout
    currentAccountToken = 1
    const swapExecutionPromise = button.props.onClick()

    // Dynamic import is already resolved or resolves with account token unchanged
    resolveImport?.({ executeRoute: mockExecuteRoute })
    await swapExecutionPromise

    // Route is executed
    expect(mockExecuteRoute).toHaveBeenCalled()
    // Propagating tx is recorded with Account A's initial token
    expect(mockAddPropagatingTx).toHaveBeenCalledWith(expect.anything(), 1)
  })
})
