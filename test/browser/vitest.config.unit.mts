import type { TestSpecification } from 'vitest/node'
import { readFileSync } from 'node:fs'
import { relative } from 'pathe'
import { defineConfig } from 'vitest/config'
import { BaseSequencer } from 'vitest/node'

// Prototype for duration-aware shard splitting (see vitest-dev/vitest#9184).
// Timings are produced by a previous CI run (per-shard JSON reports merged by
// scripts/merge-timings.mts into a map of `<spec relative path>: <duration ms>`)
// and restored via GitHub cache. The path is passed through
// `VITEST_BROWSER_TIMINGS`. When it is missing or unreadable we fall back to the
// count-based split from `BaseSequencer`.
function loadTimings(): Record<string, number> | null {
  const file = process.env.VITEST_BROWSER_TIMINGS
  if (!file) {
    return null
  }
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'))
    if (!data || typeof data !== 'object') {
      return null
    }
    return data as Record<string, number>
  }
  catch {
    return null
  }
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 1
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export default defineConfig({
  test: {
    include: ['specs/**/*.{spec,test}.ts'],
    pool: 'threads',
    fileParallelism: false,
    reporters: 'verbose',
    setupFiles: ['./setup.unit.ts'],
    // 3 is the maximum of browser instances - in a perfect world they will run in parallel
    hookTimeout: process.env.CI ? 120_000 * 3 : 20_000,
    testTimeout: process.env.CI ? 120_000 * 3 : 20_000,
    sequence: {
      // Extend BaseSequencer so `--shard` works. `shard` is overridden to split
      // specs by historical duration (greedy LPT bin-packing) instead of by
      // file count, so a heavy spec like `runner.test.ts` is balanced across
      // shards automatically. Falls back to the count-based split when no
      // timings are available. `sort` keeps a stable name-based order.
      sequencer: class Sequencer extends BaseSequencer {
        async shard(specs: TestSpecification[]): Promise<TestSpecification[]> {
          const timings = loadTimings()
          if (!timings) {
            return super.shard(specs)
          }

          const { index, count } = this.ctx.config.shard!
          const root = this.ctx.config.root

          const keyOf = (spec: TestSpecification) => relative(root, spec.moduleId)
          const known = specs
            .map(spec => timings[keyOf(spec)])
            .filter((n): n is number => typeof n === 'number' && n >= 0)
          const fallback = median(known)

          const weighted = specs
            .map(spec => ({
              spec,
              weight: timings[keyOf(spec)] ?? fallback,
            }))
            .sort((a, b) =>
              b.weight - a.weight
              || (a.spec.moduleId < b.spec.moduleId ? -1 : a.spec.moduleId > b.spec.moduleId ? 1 : 0),
            )

          const buckets = Array.from({ length: count }, () => ({
            total: 0,
            specs: [] as TestSpecification[],
          }))
          for (const { spec, weight } of weighted) {
            let target = buckets[0]
            for (const bucket of buckets) {
              if (bucket.total < target.total) {
                target = bucket
              }
            }
            target.total += weight
            target.specs.push(spec)
          }

          const selected = buckets[index - 1]
          this.ctx.logger.log(
            `[shard-by-time] shard ${index}/${count}: ${selected.specs.length} specs, `
            + `~${Math.round(selected.total)}ms estimated`,
          )
          return selected.specs
        }

        async sort(specifications: TestSpecification[]) {
          return specifications.sort((spec1, spec2) => {
            // just sort by name, ignore the cache optimization
            return spec1.moduleId.localeCompare(spec2.moduleId)
          })
        }
      },
    },
  },
})
