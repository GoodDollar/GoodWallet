import type { ChainFamily } from "@/chain/types"

import { normalizedAddress } from "./utils"

export class NormalizedAddressMap<K extends string, V> extends Map<string, V> {
  constructor(
    private readonly chainFamily: ChainFamily,
    entries?: ReadonlyArray<[K, V]> | null,
  ) {
    super(
      entries?.map(([key, value]) => [
        normalizedAddress(chainFamily, key),
        value,
      ]),
    )
  }

  get(key: K) {
    return super.get(normalizedAddress(this.chainFamily, key))
  }

  set(key: K, value: V) {
    return super.set(normalizedAddress(this.chainFamily, key), value)
  }

  has(key: K) {
    return super.has(normalizedAddress(this.chainFamily, key))
  }

  delete(key: K) {
    return super.delete(normalizedAddress(this.chainFamily, key))
  }
}
