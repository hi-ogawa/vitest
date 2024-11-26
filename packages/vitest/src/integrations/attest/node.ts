import type { TestProject } from '../../node/project'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

async function precache() {
  // TODO: programatic API
  mkdirSync('.attest/assertions', { recursive: true })
  execFileSync('attest', ['precache', '.attest/assertions/typescript.json'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ATTEST_attestAliases: JSON.stringify(['attest', 'expect']),
    },
  })
}

export async function globalSetupAttest(project: TestProject) {
  if (!project.config.attest) {
    process.env.ATTEST_skipTypes = 'true'
    return
  }
  await project.vitest.packageInstaller.ensureInstalled(
    '@ark/attest',
    project.config.root,
    project.vitest.version,
  )
  await precache()
  project.onTestsRerun(() => precache())
}