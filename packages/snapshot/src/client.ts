import type { RawSnapshotInfo } from './port/rawSnapshot'
import type { SnapshotResult, SnapshotStateOptions } from './types'
import SnapshotState from './port/state'
import { deepMergeSnapshot, DefaultMap, PromiseMap } from './port/utils'

function createMismatchError(
  message: string,
  expand: boolean | undefined,
  actual: unknown,
  expected: unknown,
) {
  const error = new Error(message)
  Object.defineProperty(error, 'actual', {
    value: actual,
    enumerable: true,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(error, 'expected', {
    value: expected,
    enumerable: true,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(error, 'diffOptions', { value: { expand } })
  return error
}

export interface Context {
  file: string
  title?: string
  fullTitle?: string
}

interface AssertOptions {
  received: unknown
  filepath: string
  name: string
  testId: string
  message?: string
  isInline?: boolean
  properties?: object
  inlineSnapshot?: string
  error?: Error
  errorMessage?: string
  rawSnapshot?: RawSnapshotInfo
}

export interface SnapshotClientOptions {
  isEqual?: (received: unknown, expected: unknown) => boolean
}

export class SnapshotClient {
  // snapshotStateMap: Map<string, SnapshotState> = new Map()

  constructor(private options: SnapshotClientOptions = {}) {}

  // async setup(
  //   filepath: string,
  //   options: SnapshotStateOptions,
  // ): Promise<void> {
  //   if (this.snapshotStateMap.has(filepath)) {
  //     throw new Error('already setup')
  //   }
  //   this.snapshotStateMap.set(
  //     filepath,
  //     await SnapshotState.create(filepath, options),
  //   )
  // }

  async finish(filepath: string): Promise<SnapshotResult> {
    const states = new Set(
      [...this.fileToTestIds.get(filepath)].map(testId =>
        this.getSnapshotState(testId),
      ),
    )
    this.fileToTestIds.delete(filepath)
    const results: SnapshotResult[] = []
    for (const state of states) {
      const result = await state.pack()
      results.push(result)
    }
    // TODO: aggregate result
    return results[0]
  }

  private fileToTestIds = new DefaultMap<string, Set<string>>(() => new Set())
  private testIdToSnapshotPath = new Map<string, string>()
  private snapshotPathToState = new PromiseMap<string, SnapshotState>()

  // resolve snapshot file for each test and reuse state for same snapshot file
  // TODO: concurrent safe
  async setupTest(
    filepath: string,
    testId: string,
    options: SnapshotStateOptions,
  ): Promise<SnapshotState> {
    this.fileToTestIds.get(filepath).add(testId)
    const snapshotPath = await options.snapshotEnvironment.resolvePath(filepath)
    this.testIdToSnapshotPath.set(testId, snapshotPath)
    const state = await this.snapshotPathToState.getOrCreate(snapshotPath, async () => {
      const content = await options.snapshotEnvironment.readSnapshotFile(snapshotPath)
      return new SnapshotState(filepath, snapshotPath, content, options)
    })
    state.clearTest(testId)
    return state
  }

  skipTest(testId: string, testName: string): void {
    const state = this.getSnapshotState(testId)
    state.markSnapshotsAsCheckedForTest(testName)
  }

  // clearTest(testId: string): void {
  //   const state = this.getSnapshotState(testId)
  //   state.clearTest(testId)
  // }

  getSnapshotState(testId: string): SnapshotState {
    const snapshotPath = this.testIdToSnapshotPath.get(testId)
    if (snapshotPath) {
      const state = this.snapshotPathToState.get(snapshotPath)
      if (state) {
        return state
      }
    }
    // TODO:
    // maybe should setup one for fallback in concurrent case?
    // or just warning users to use `TestContext.expect`?
    throw new Error('snapshot state not initialized')
  }

  assert(options: AssertOptions): void {
    const {
      filepath,
      name,
      testId,
      message,
      isInline = false,
      properties,
      inlineSnapshot,
      error,
      errorMessage,
      rawSnapshot,
    } = options
    let { received } = options

    if (!filepath) {
      throw new Error('Snapshot cannot be used outside of test')
    }

    const snapshotState = this.getSnapshotState(testId)

    if (typeof properties === 'object') {
      if (typeof received !== 'object' || !received) {
        throw new Error(
          'Received value must be an object when the matcher has properties',
        )
      }

      try {
        const pass = this.options.isEqual?.(received, properties) ?? false
        // const pass = equals(received, properties, [iterableEquality, subsetEquality])
        if (!pass) {
          throw createMismatchError(
            'Snapshot properties mismatched',
            snapshotState.expand,
            received,
            properties,
          )
        }
        else {
          received = deepMergeSnapshot(received, properties)
        }
      }
      catch (err: any) {
        err.message = errorMessage || 'Snapshot mismatched'
        throw err
      }
    }

    const testName = [name, ...(message ? [message] : [])].join(' > ')

    const { actual, expected, key, pass } = snapshotState.match({
      testId,
      testName,
      received,
      isInline,
      error,
      inlineSnapshot,
      rawSnapshot,
    })

    if (!pass) {
      throw createMismatchError(
        `Snapshot \`${key || 'unknown'}\` mismatched`,
        snapshotState.expand,
        actual?.trim(),
        expected?.trim(),
      )
    }
  }

  async assertRaw(options: AssertOptions): Promise<void> {
    if (!options.rawSnapshot) {
      throw new Error('Raw snapshot is required')
    }

    const { filepath, rawSnapshot } = options

    if (rawSnapshot.content == null) {
      if (!filepath) {
        throw new Error('Snapshot cannot be used outside of test')
      }

      const snapshotState = this.getSnapshotState(options.testId)

      // save the filepath, so it don't lose even if the await make it out-of-context
      options.filepath ||= filepath
      // resolve and read the raw snapshot file
      rawSnapshot.file = await snapshotState.environment.resolveRawPath(
        filepath,
        rawSnapshot.file,
      )
      rawSnapshot.content
        = (await snapshotState.environment.readSnapshotFile(rawSnapshot.file))
        ?? undefined
    }

    return this.assert(options)
  }

  clear(): void {
    this.fileToTestIds.clear()
    this.testIdToSnapshotPath.clear()
    this.snapshotPathToState.clear()
    // this.snapshotStateMap.clear()
  }
}
