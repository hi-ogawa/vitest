import { it, beforeAll } from 'vitest';

beforeAll(async () => {
  const { Console } = await import("node:console");
  globalThis.console = new Console(process.stdout, process.stderr);
});

it.concurrent('1st', ({ expect }) => {
  expect("hi").toMatchInlineSnapshot();
});

it.concurrent('2nd', ({ expect }) => {
  expect("hi").toMatchInlineSnapshot(`"hi"`);
});

// it('1st', ({ expect }) => {
//   expect("hi").toMatchInlineSnapshot(`"hi"`);
// });

// it('2nd', ({ expect }) => {
//   expect("hi").toMatchInlineSnapshot(`"hi"`);
// });
