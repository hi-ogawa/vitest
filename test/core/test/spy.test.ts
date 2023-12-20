import type { Mock } from 'vitest'
import { describe, expect, expectTypeOf, test, vi } from 'vitest'
import * as mock from './fixtures/hello-mock'

/**
 * @vitest-environment happy-dom
 */

describe('spyOn', () => {
  const hw = new mock.HelloWorld()

  test('correctly infers method types', async () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue('world')
    expect(window.localStorage.getItem('hello')).toEqual('world')
  })

  test('infers a class correctly', () => {
    vi.spyOn(mock, 'HelloWorld').mockImplementationOnce(() => {
      const Mock = vi.fn()
      Mock.prototype.hello = vi.fn(() => 'hello world')
      return new Mock()
    })

    const mockedHelloWorld = new mock.HelloWorld()
    expect(mockedHelloWorld.hello()).toEqual('hello world')
  })

  test('infers a method correctly', () => {
    vi.spyOn(hw, 'hello').mockImplementationOnce(() => 'hello world')

    expect(hw.hello()).toEqual('hello world')
  })
})

test('types', () => {
  // https://jestjs.io/docs/mock-function-api#typescript-usage

  const add = (x: number, y: number) => x + y
  const calculate = (op: (x: number, y: number) => number, x: number, y: number) => op(x, y)

  // currently requires separate generics for Args and Return
  type Add = typeof add
  const mockAdd1 = vi.fn<Parameters<Add>, ReturnType<Add>>()

  mockAdd1.mockImplementation((x, y) => {
    // arguments types are inferred
    expectTypeOf(x).toEqualTypeOf<number>()
    expectTypeOf(y).toEqualTypeOf<number>()
    return x + y
  })

  expect(calculate(mockAdd1, 1, 2)).toBe(3)
  expect(mockAdd1).toHaveBeenCalledTimes(1)
  expect(mockAdd1).toHaveBeenCalledWith(1, 2)

  const mockAdd2: Mock<Parameters<Add>, ReturnType<Add>> = vi.fn((x, y) => {
    // arguments types are inferred
    expectTypeOf(x).toEqualTypeOf<number>()
    expectTypeOf(y).toEqualTypeOf<number>()
    return x + y
  })

  expect(calculate(mockAdd2, 1, 2)).toBe(3)
  expect(mockAdd2).toHaveBeenCalledTimes(1)
  expect(mockAdd2).toHaveBeenCalledWith(1, 2)
})
