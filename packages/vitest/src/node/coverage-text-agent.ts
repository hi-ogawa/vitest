import type { FileCoverage } from 'istanbul-lib-coverage'
import type { ContentWriter, Node, ReportNode } from 'istanbul-lib-report'
import { ReportBase } from 'istanbul-lib-report'

// TODO: review
class TextAgentReport extends ReportBase {
  private cw!: ContentWriter

  onStart(_root: Node, context: any): void {
    this.cw = context.writer.writeFile(null)
  }

  onDetail(node: ReportNode): void {
    const summary = node.getCoverageSummary(false)

    if (
      summary.lines.pct === 100
      && summary.functions.pct === 100
      && summary.branches.pct === 100
      && summary.statements.pct === 100
    ) {
      return
    }

    const fileCoverage = node.getFileCoverage()
    const parts: string[] = []

    const lines = uncoveredLines(fileCoverage)
    if (lines) {
      parts.push(`  lines:     ${lines}`)
    }

    const fns = uncoveredFunctions(fileCoverage)
    if (fns) {
      parts.push(`  functions: ${fns}`)
    }

    const branches = uncoveredBranches(fileCoverage)
    if (branches) {
      parts.push(`  branches:  ${branches}`)
    }

    if (parts.length > 0) {
      this.cw.println(node.getRelativeName())
      for (const part of parts) {
        this.cw.println(part)
      }
    }
  }

  onEnd(): void {
    this.cw.close()
  }
}

function uncoveredLines(fc: FileCoverage): string {
  const lineCoverage = fc.getLineCoverage()
  let newRange = true
  const ranges = Object.entries(lineCoverage)
    .reduce<Array<[number, number?]>>((acc, [line, hit]) => {
      if (hit) {
        newRange = true
      }
      else {
        const n = Number(line)
        if (newRange) {
          acc.push([n])
          newRange = false
        }
        else {
          acc[acc.length - 1][1] = n
        }
      }
      return acc
    }, [])
    .map(([start, end]) => (end !== undefined ? `${start}-${end}` : String(start)))

  return ranges.join(', ')
}

function uncoveredFunctions(fc: FileCoverage): string {
  return Object.entries(fc.f)
    .filter(([, hits]) => hits === 0)
    .map(([id]) => {
      const fn = fc.fnMap[id]
      const line = fn.decl?.start?.line ?? fn.loc?.start?.line ?? fn.line
      const name = fn.name && !fn.name.startsWith('(anonymous') ? fn.name : null
      return name ? `${name} (line ${line})` : `(line ${line})`
    })
    .join(', ')
}

function uncoveredBranches(fc: FileCoverage): string {
  return Object.entries(fc.b)
    .flatMap(([id, counts]) => {
      const branch = fc.branchMap[id]
      return counts
        .map((hits, i) => ({ hits, loc: branch.locations?.[i] ?? branch.loc }))
        .filter(({ hits }) => hits === 0)
        .map(({ loc }) => `${branch.type} (line ${loc?.start?.line ?? '?'})`)
    })
    .join(', ')
}

export default TextAgentReport
