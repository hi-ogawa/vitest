import type { ResolvedConfig, WorkerGlobalState } from 'vitest'

export async function importId(id: string) {
  const name = `/@id/${id}`
  return getBrowserState().wrapModule(() => import(name))
}

export function getConfig(): ResolvedConfig {
  return getBrowserState().config
}

export interface BrowserRunnerState {
  files: string[]
  runningFiles: string[]
  moduleCache: WorkerGlobalState['moduleCache']
  config: ResolvedConfig
  viteConfig: {
    root: string
  }
  type: 'tester' | 'orchestrator'
  wrapModule: <T>(module: () => T) => T
  iframeId?: string
  contextId: string
  runTests?: (tests: string[]) => Promise<void>
  createTesters?: (files: string[]) => Promise<void>
}

export function getBrowserState(): BrowserRunnerState {
  // @ts-expect-error not typed global
  return window.__vitest_browser_runner__
}
