import { describe, it, expect } from "vitest"

describe("some-suite", () => {
  it("basic", () => {
    expect(0).toBe(0)
  })

  it("named", function xxx() {
    expect(0).toBe(0)
  })

  it.skip("skip", () => {
    expect(0).toBe(0)
  })

  it.skip.concurrent("skip.concurrent", () => {
    expect(0).toBe(0)
  })

  it.runIf(true).each([0, 1])("runIf.each", (param) => {
  });
})
