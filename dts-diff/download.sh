#!/bin/bash
set -eu -o pipefail

packages=(
  @vitest/browser
  @vitest/coverage-istanbul
  @vitest/coverage-v8
  @vitest/expect
  @vitest/mocker
  @vitest/pretty-format
  @vitest/runner
  @vitest/snapshot
  @vitest/spy
  @vitest/ui
  @vitest/utils
  vite-node
  vitest
  @vitest/web-worker
  @vitest/ws-client
)

for package in "${packages[@]}"; do
  filename=$(npm pack "https://pkg.pr.new/${package}@43abe5d")
  mkdir -p packages/${package}
  tar -xzf "${filename}" -C "packages/${package}" --strip-components=1
done
