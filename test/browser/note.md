## caller

- original

```js
import cjsDefault from '@vitest/cjs-lib'
import * as cjsNamespace from '@vitest/cjs-lib'

console.log({
  cjsDefault,
  cjsNamespace,
});
```

- vitest slowHijackESM

```js
import { __vi_inject__ as __vi_esm_1__ } from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
import { __vi_inject__ as __vi_esm_2__ } from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";

console.log({
  cjsDefault: __vi_esm_1__.default,
  cjsNamespace: __vi_esm_2__,
});
```

- vite cjs

```js
import __vite__cjsImport1__vitest_cjsLib from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const cjsDefault = __vite__cjsImport1__vitest_cjsLib.__esModule ? __vite__cjsImport1__vitest_cjsLib.default : __vite__cjsImport1__vitest_cjsLib;
import __vite__cjsImport2__vitest_cjsLib from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const cjsNamespace = __vite__cjsImport2__vitest_cjsLib;

console.log({
  cjsDefault,
  cjsNamespace,
});
```

- vitest slowHijackESM => vite cjs

```js
import __vite__cjsImport1__vitest_cjsLib from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const __vi_esm_1__ = __vite__cjsImport1__vitest_cjsLib["__vi_inject__"]
import __vite__cjsImport2__vitest_cjsLib from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const __vi_esm_2__ = __vite__cjsImport2__vitest_cjsLib["__vi_inject__"]

console.log({
  cjsDefault: __vi_esm_1__.default,
  cjsNamespace: __vi_esm_2__,
});
```

- if the order is reversed?

```js
import { __vi_inject__ as __vi_esm_1__ } from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const cjsDefault = __vi_esm_1__.default.__esModule ? __vi_esm_1__.default.default : __vi_esm_1__.default;
import { __vi_inject__ as __vi_esm_2__ } from "/node_modules/.vite/deps/@vitest_cjs-lib.js?v=49c9a122";
const cjsNamespace = __vi_esm_2__;

console.log({
  cjsDefault,
  cjsNamespace,
});
```

- does default import even necessary to rewrite?

```js
import cjsDefault from '@vitest/cjs-lib'
import * as cjsNamespace from '@vitest/cjs-lib'
```

## callee lib

- original

```js
export default require_cjs_lib();
```

- Vitest slowHijackESM

```js
// ...
__vi_inject__.default = require_cjs_lib();

export default { __vi_inject__: __vi_inject__.default };

export { __vi_inject__ }
```

- what if?

```js
// ...
__vi_inject__.default = require_cjs_lib();

export default { __vi_inject__ }; ///// no default unwrap

export { __vi_inject__ }
```
