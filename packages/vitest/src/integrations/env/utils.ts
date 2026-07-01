import { KEYS } from './jsdom-keys'

const skipKeys = ['window', 'self', 'top', 'parent']

export function getWindowKeys(
  global: any,
  win: any,
  additionalKeys: string[] = [],
): Set<string> {
  // Keys we always take from `win`, even when Node's global already defines
  // them. This curated allowlist is the "override anyway" set.
  const keys = new Set<string>([...additionalKeys, ...KEYS])

  // Plus anything the window owns that Node doesn't already have, so we add DOM
  // globals without clobbering Node built-ins we haven't opted to override.
  for (const key of Object.getOwnPropertyNames(win)) {
    if (!(key in global)) {
      keys.add(key)
    }
  }

  // These are wired up separately (global.window = global, etc.), never copied.
  for (const skipKey of skipKeys) {
    keys.delete(skipKey)
  }

  return keys
}

function isClassLikeName(name: string) {
  return name[0] === name[0].toUpperCase()
}

interface PopulateOptions {
  // we bind functions such as addEventListener and others
  // because they rely on `this` in happy-dom, and in jsdom it
  // has a priority for getting implementation from symbols
  // (global doesn't have these symbols, but window - does)
  bindFunctions?: boolean

  additionalKeys?: string[]
}

export function populateGlobal(
  global: any,
  win: any,
  options: PopulateOptions = {},
): {
  keys: Set<string>
  skipKeys: string[]
  originals: Map<string | symbol, any>
} {
  const { bindFunctions = false } = options
  const keys = getWindowKeys(global, win, options.additionalKeys)

  const originals = new Map<string | symbol, any>()

  const overriddenKeys = new Set([...KEYS, ...options.additionalKeys || []])

  const overrideObject = new Map<string | symbol, any>()
  for (const key of keys) {
    const boundFunction
      = bindFunctions
        && typeof win[key] === 'function'
        && !isClassLikeName(key)
        && win[key].bind(win)

    if (overriddenKeys.has(key) && key in global) {
      originals.set(key, global[key])
    }

    Object.defineProperty(global, key, {
      get() {
        if (overrideObject.has(key)) {
          return overrideObject.get(key)
        }
        if (boundFunction) {
          return boundFunction
        }
        return win[key]
      },
      set(v) {
        overrideObject.set(key, v)
        // propagate changes to underlying window implementation,
        // which can affect other window API behavior internally, e.g.
        // updating `innerWidth` affects `matchMedia("(max-width: *)")` on happy-dom.
        win[key] = v
      },
      configurable: true,
    })
  }

  global.window = global
  global.self = global
  global.top = global
  global.parent = global

  if (global.global) {
    global.global = global
  }

  // rewrite defaultView to reference the same global context
  if (global.document && global.document.defaultView) {
    Object.defineProperty(global.document, 'defaultView', {
      get: () => global,
      enumerable: true,
      configurable: true,
    })
  }

  skipKeys.forEach(k => keys.add(k))

  return {
    keys,
    skipKeys,
    originals,
  }
}
