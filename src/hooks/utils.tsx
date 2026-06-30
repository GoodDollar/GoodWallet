import {
  type EffectCallback,
  type MutableRefObject,
  useEffect,
  useRef,
} from "react"

export const useEffectOnce: typeof useEffect = (effect: EffectCallback) => {
  const initializingRef = useRef(false)

  useEffect(() => {
    if (initializingRef.current) {
      return
    }

    initializingRef.current = true
    return effect()
  }, [effect])
}

function useRefInitializer<T>(initializer: () => T): MutableRefObject<T> {
  const ref = useRef<T>(undefined)

  if (ref.current === undefined) {
    ref.current = initializer()
  }

  return ref as MutableRefObject<T>
}

export const usePromise = () =>
  useRefInitializer<[Promise<void>, () => void]>(() => {
    let resolve = () => {}
    const promise = new Promise<void>((_resolve) => (resolve = _resolve))

    return [promise, resolve]
  }).current
