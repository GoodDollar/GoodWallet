import { proxy, subscribe } from "valtio"
import { subscribeKey } from "valtio/utils"

import { type Balances, getBalances } from "../fetchers/balances"
import { amountsStore } from "./amountsStore"
import { pricesStore } from "./pricesStore"

type BalancesStore = {
  balances: Balances
}

export const balancesStore = proxy<BalancesStore>({
  balances: getBalances(amountsStore.amounts, pricesStore.prices),
})

//Cannot subscribeKey to a ProxyMap
subscribe(amountsStore.amounts, () => {
  balancesStore.balances = getBalances(amountsStore.amounts, pricesStore.prices)
})

subscribeKey(pricesStore, "prices", () => {
  balancesStore.balances = getBalances(amountsStore.amounts, pricesStore.prices)
})
