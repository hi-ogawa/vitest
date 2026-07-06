// Merge per-shard Vitest JSON reports into a compact timings map consumed by
// the duration-aware sequencer in `vitest.config.unit.mts` (see #9184).
//
// Usage: tsx scripts/merge-timings.mts <reports-dir> <output-file>
//   reports-dir  directory containing `*.json` reports (default: timings-reports)
//   output-file  timings map destination (default: specs-timings.json)
//
// Each report entry contributes `endTime - startTime` per spec. When a spec
// appears in multiple reports (e.g. different OS shards) the longest duration
// wins, to avoid under-weighting a spec that a heavy shard would inflate.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface JsonReport {
  testResults?: Array<{
    name: string
    startTime?: number
    endTime?: number
  }>
}

const [, , reportsDirArg, outputArg] = process.argv
const reportsDir = resolve(process.cwd(), reportsDirArg || 'timings-reports')
const outputFile = resolve(process.cwd(), outputArg || 'specs-timings.json')

function keyOf(name: string): string {
  const normalized = name.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/specs/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

const timings: Record<string, number> = {}

const files = readdirSync(reportsDir).filter(file => file.endsWith('.json'))
if (files.length === 0) {
  throw new Error(`no JSON reports found in "${reportsDir}"`)
}

for (const file of files) {
  const report = JSON.parse(readFileSync(resolve(reportsDir, file), 'utf-8')) as JsonReport
  for (const result of report.testResults ?? []) {
    if (result.startTime == null || result.endTime == null) {
      continue
    }
    const duration = Math.max(0, result.endTime - result.startTime)
    const key = keyOf(result.name)
    if (timings[key] == null || duration > timings[key]) {
      timings[key] = Math.round(duration)
    }
  }
}

const sorted = Object.fromEntries(
  Object.entries(timings).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
)

writeFileSync(outputFile, `${JSON.stringify(sorted, null, 2)}\n`)

console.log(`wrote ${Object.keys(sorted).length} spec timings to ${outputFile}`)
