import { it } from 'vitest';

it.concurrent('1st', ({ expect }) => {
  expect("hi").toMatchSnapshot();
});

it.concurrent('2nd', ({ expect }) => {
  expect("hi").toMatchSnapshot();
});
