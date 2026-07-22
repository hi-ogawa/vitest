import type { RunnerTestCase, TestArtifactLocation } from 'vitest'
import type { NavigationOptions } from './navigation'
import { relative } from 'pathe'
import { config } from './client'
import { showAttachmentSource } from './codemirror'

export function openLocation(
  test: RunnerTestCase,
  location?: TestArtifactLocation,
  options?: NavigationOptions,
) {
  return showAttachmentSource(test, location, options)
}

export function getLocationString(location: TestArtifactLocation) {
  const root = config.value.root
  const path = root ? relative(root, location.file) : location.file

  return `${path}:${location.line}:${location.column}`
}
