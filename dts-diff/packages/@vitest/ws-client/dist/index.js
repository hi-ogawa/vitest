import { createBirpc } from 'birpc';

/// <reference types="../types/index.d.ts" />

// (c) 2020-present Andrea Giammarchi

const {parse: $parse, stringify: $stringify} = JSON;
const {keys} = Object;

const Primitive = String;   // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore = {};
const object = 'object';

const noop = (_, value) => value;

const primitives = value => (
  value instanceof Primitive ? Primitive(value) : value
);

const Primitives = (_, value) => (
  typeof value === primitive ? new Primitive(value) : value
);

const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), {length} = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({k, a: [input, parsed, tmp, $]});
      }
      else
        output[k] = $.call(output, k, tmp);
    }
    else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let {length} = lazy, i = 0; i < length; i++) {
    const {k, a} = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};

const set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};

/**
 * Converts a specialized flatted string into a JS value.
 * @param {string} text
 * @param {(this: any, key: string, value: any) => any} [reviver]
 * @returns {any}
 */
const parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ?
              revive(input, new Set, value, $) :
              value;
  return $.call({'': tmp}, '', tmp);
};

/**
 * Converts a JS value into a specialized flatted string.
 * @param {any} value
 * @param {((this: any, key: string, value: any) => any) | (string | number)[] | null | undefined} [replacer]
 * @param {string | number | undefined} [space]
 * @returns {string}
 */
const stringify$1 = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ?
            (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0) :
            (replacer || noop);
  const known = new Map;
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({'': value}, '', value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return '[' + output.join(',') + ']';
  function replace(key, value) {
    if (firstRun) {
      firstRun = !firstRun;
      return value;
    }
    const after = $.call(this, key, value);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};

// src/index.ts
var f = {
  reset: [0, 0],
  bold: [1, 22, "\x1B[22m\x1B[1m"],
  dim: [2, 22, "\x1B[22m\x1B[2m"],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  blackBright: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
  bgBlackBright: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhiteBright: [107, 49]
}, h = Object.entries(f);
function a(n) {
  return String(n);
}
a.open = "";
a.close = "";
function C(n = false) {
  let e = typeof process != "undefined" ? process : void 0, i = (e == null ? void 0 : e.env) || {}, g = (e == null ? void 0 : e.argv) || [];
  return !("NO_COLOR" in i || g.includes("--no-color")) && ("FORCE_COLOR" in i || g.includes("--color") || (e == null ? void 0 : e.platform) === "win32" || n && i.TERM !== "dumb" || "CI" in i) || typeof window != "undefined" && !!window.chrome;
}
function p(n = false) {
  let e = C(n), i = (r, t, c, o) => {
    let l = "", s = 0;
    do
      l += r.substring(s, o) + c, s = o + t.length, o = r.indexOf(t, s);
    while (~o);
    return l + r.substring(s);
  }, g = (r, t, c = r) => {
    let o = (l) => {
      let s = String(l), b = s.indexOf(t, r.length);
      return ~b ? r + i(s, t, c, b) + t : r + s + t;
    };
    return o.open = r, o.close = t, o;
  }, u = {
    isColorSupported: e
  }, d = (r) => `\x1B[${r}m`;
  for (let [r, t] of h)
    u[r] = e ? g(
      d(t[0]),
      d(t[1]),
      t[2]
    ) : a;
  return u;
}

var s = p();

function _mergeNamespaces(n, m) {
  m.forEach(function(e) {
    e && typeof e !== "string" && !Array.isArray(e) && Object.keys(e).forEach(function(k) {
      if (k !== "default" && !(k in n)) {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function() {
            return e[k];
          }
        });
      }
    });
  });
  return Object.freeze(n);
}
function getKeysOfEnumerableProperties(object, compareKeys) {
  const rawKeys = Object.keys(object);
  const keys = compareKeys === null ? rawKeys : rawKeys.sort(compareKeys);
  if (Object.getOwnPropertySymbols) {
    for (const symbol of Object.getOwnPropertySymbols(object)) {
      if (Object.getOwnPropertyDescriptor(object, symbol).enumerable) {
        keys.push(symbol);
      }
    }
  }
  return keys;
}
function printIteratorEntries(iterator, config, indentation, depth, refs, printer2, separator = ": ") {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config.maxWidth) {
        result += "\u2026";
        break;
      }
      const name = printer2(
        current.value[0],
        config,
        indentationNext,
        depth,
        refs
      );
      const value = printer2(
        current.value[1],
        config,
        indentationNext,
        depth,
        refs
      );
      result += name + separator + value;
      current = iterator.next();
      if (!current.done) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printIteratorValues(iterator, config, indentation, depth, refs, printer2) {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config.maxWidth) {
        result += "\u2026";
        break;
      }
      result += printer2(current.value, config, indentationNext, depth, refs);
      current = iterator.next();
      if (!current.done) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printListItems(list, config, indentation, depth, refs, printer2) {
  let result = "";
  list = list instanceof ArrayBuffer ? new DataView(list) : list;
  const isDataView = (l) => l instanceof DataView;
  const length = isDataView(list) ? list.byteLength : list.length;
  if (length > 0) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    for (let i = 0; i < length; i++) {
      result += indentationNext;
      if (i === config.maxWidth) {
        result += "\u2026";
        break;
      }
      if (isDataView(list) || i in list) {
        result += printer2(
          isDataView(list) ? list.getInt8(i) : list[i],
          config,
          indentationNext,
          depth,
          refs
        );
      }
      if (i < length - 1) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
function printObjectProperties(val, config, indentation, depth, refs, printer2) {
  let result = "";
  const keys = getKeysOfEnumerableProperties(val, config.compareKeys);
  if (keys.length > 0) {
    result += config.spacingOuter;
    const indentationNext = indentation + config.indent;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const name = printer2(key, config, indentationNext, depth, refs);
      const value = printer2(val[key], config, indentationNext, depth, refs);
      result += `${indentationNext + name}: ${value}`;
      if (i < keys.length - 1) {
        result += `,${config.spacingInner}`;
      } else if (!config.min) {
        result += ",";
      }
    }
    result += config.spacingOuter + indentation;
  }
  return result;
}
const asymmetricMatcher = typeof Symbol === "function" && Symbol.for ? Symbol.for("jest.asymmetricMatcher") : 1267621;
const SPACE$2 = " ";
const serialize$5 = (val, config, indentation, depth, refs, printer2) => {
  const stringedValue = val.toString();
  if (stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining") {
    if (++depth > config.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}[${printListItems(
      val.sample,
      config,
      indentation,
      depth,
      refs,
      printer2
    )}]`;
  }
  if (stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining") {
    if (++depth > config.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}{${printObjectProperties(
      val.sample,
      config,
      indentation,
      depth,
      refs,
      printer2
    )}}`;
  }
  if (stringedValue === "StringMatching" || stringedValue === "StringNotMatching") {
    return stringedValue + SPACE$2 + printer2(val.sample, config, indentation, depth, refs);
  }
  if (stringedValue === "StringContaining" || stringedValue === "StringNotContaining") {
    return stringedValue + SPACE$2 + printer2(val.sample, config, indentation, depth, refs);
  }
  if (typeof val.toAsymmetricMatcher !== "function") {
    throw new TypeError(
      `Asymmetric matcher ${val.constructor.name} does not implement toAsymmetricMatcher()`
    );
  }
  return val.toAsymmetricMatcher();
};
const test$5 = (val) => val && val.$$typeof === asymmetricMatcher;
const plugin$5 = { serialize: serialize$5, test: test$5 };
const SPACE$1 = " ";
const OBJECT_NAMES = /* @__PURE__ */ new Set(["DOMStringMap", "NamedNodeMap"]);
const ARRAY_REGEXP = /^(?:HTML\w*Collection|NodeList)$/;
function testName(name) {
  return OBJECT_NAMES.has(name) || ARRAY_REGEXP.test(name);
}
const test$4 = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
function isNamedNodeMap(collection) {
  return collection.constructor.name === "NamedNodeMap";
}
const serialize$4 = (collection, config, indentation, depth, refs, printer2) => {
  const name = collection.constructor.name;
  if (++depth > config.maxDepth) {
    return `[${name}]`;
  }
  return (config.min ? "" : name + SPACE$1) + (OBJECT_NAMES.has(name) ? `{${printObjectProperties(
    isNamedNodeMap(collection) ? [...collection].reduce(
      (props, attribute) => {
        props[attribute.name] = attribute.value;
        return props;
      },
      {}
    ) : { ...collection },
    config,
    indentation,
    depth,
    refs,
    printer2
  )}}` : `[${printListItems(
    [...collection],
    config,
    indentation,
    depth,
    refs,
    printer2
  )}]`);
};
const plugin$4 = { serialize: serialize$4, test: test$4 };
function escapeHTML(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function printProps(keys, props, config, indentation, depth, refs, printer2) {
  const indentationNext = indentation + config.indent;
  const colors = config.colors;
  return keys.map((key) => {
    const value = props[key];
    let printed = printer2(value, config, indentationNext, depth, refs);
    if (typeof value !== "string") {
      if (printed.includes("\n")) {
        printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation;
      }
      printed = `{${printed}}`;
    }
    return `${config.spacingInner + indentation + colors.prop.open + key + colors.prop.close}=${colors.value.open}${printed}${colors.value.close}`;
  }).join("");
}
function printChildren(children, config, indentation, depth, refs, printer2) {
  return children.map(
    (child) => config.spacingOuter + indentation + (typeof child === "string" ? printText(child, config) : printer2(child, config, indentation, depth, refs))
  ).join("");
}
function printText(text, config) {
  const contentColor = config.colors.content;
  return contentColor.open + escapeHTML(text) + contentColor.close;
}
function printComment(comment, config) {
  const commentColor = config.colors.comment;
  return `${commentColor.open}<!--${escapeHTML(comment)}-->${commentColor.close}`;
}
function printElement(type, printedProps, printedChildren, config, indentation) {
  const tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open}${printedChildren ? `>${tagColor.close}${printedChildren}${config.spacingOuter}${indentation}${tagColor.open}</${type}` : `${printedProps && !config.min ? "" : " "}/`}>${tagColor.close}`;
}
function printElementAsLeaf(type, config) {
  const tagColor = config.colors.tag;
  return `${tagColor.open}<${type}${tagColor.close} \u2026${tagColor.open} />${tagColor.close}`;
}
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const FRAGMENT_NODE = 11;
const ELEMENT_REGEXP = /^(?:(?:HTML|SVG)\w*)?Element$/;
function testHasAttribute(val) {
  try {
    return typeof val.hasAttribute === "function" && val.hasAttribute("is");
  } catch {
    return false;
  }
}
function testNode(val) {
  const constructorName = val.constructor.name;
  const { nodeType, tagName } = val;
  const isCustomElement = typeof tagName === "string" && tagName.includes("-") || testHasAttribute(val);
  return nodeType === ELEMENT_NODE && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE && constructorName === "Text" || nodeType === COMMENT_NODE && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
}
const test$3 = (val) => {
  var _a;
  return ((_a = val == null ? void 0 : val.constructor) == null ? void 0 : _a.name) && testNode(val);
};
function nodeIsText(node) {
  return node.nodeType === TEXT_NODE;
}
function nodeIsComment(node) {
  return node.nodeType === COMMENT_NODE;
}
function nodeIsFragment(node) {
  return node.nodeType === FRAGMENT_NODE;
}
const serialize$3 = (node, config, indentation, depth, refs, printer2) => {
  if (nodeIsText(node)) {
    return printText(node.data, config);
  }
  if (nodeIsComment(node)) {
    return printComment(node.data, config);
  }
  const type = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
  if (++depth > config.maxDepth) {
    return printElementAsLeaf(type, config);
  }
  return printElement(
    type,
    printProps(
      nodeIsFragment(node) ? [] : Array.from(node.attributes, (attr) => attr.name).sort(),
      nodeIsFragment(node) ? {} : [...node.attributes].reduce(
        (props, attribute) => {
          props[attribute.name] = attribute.value;
          return props;
        },
        {}
      ),
      config,
      indentation + config.indent,
      depth,
      refs,
      printer2
    ),
    printChildren(
      Array.prototype.slice.call(node.childNodes || node.children),
      config,
      indentation + config.indent,
      depth,
      refs,
      printer2
    ),
    config,
    indentation
  );
};
const plugin$3 = { serialize: serialize$3, test: test$3 };
const IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@";
const IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@";
const IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@";
const IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@";
const IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@";
const IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@";
const IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@";
const IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@";
const IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@";
const getImmutableName = (name) => `Immutable.${name}`;
const printAsLeaf = (name) => `[${name}]`;
const SPACE = " ";
const LAZY = "\u2026";
function printImmutableEntries(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}{${printIteratorEntries(
    val.entries(),
    config,
    indentation,
    depth,
    refs,
    printer2
  )}}`;
}
function getRecordEntries(val) {
  let i = 0;
  return {
    next() {
      if (i < val._keys.length) {
        const key = val._keys[i++];
        return { done: false, value: [key, val.get(key)] };
      }
      return { done: true, value: void 0 };
    }
  };
}
function printImmutableRecord(val, config, indentation, depth, refs, printer2) {
  const name = getImmutableName(val._name || "Record");
  return ++depth > config.maxDepth ? printAsLeaf(name) : `${name + SPACE}{${printIteratorEntries(
    getRecordEntries(val),
    config,
    indentation,
    depth,
    refs,
    printer2
  )}}`;
}
function printImmutableSeq(val, config, indentation, depth, refs, printer2) {
  const name = getImmutableName("Seq");
  if (++depth > config.maxDepth) {
    return printAsLeaf(name);
  }
  if (val[IS_KEYED_SENTINEL]) {
    return `${name + SPACE}{${// from Immutable collection of entries or from ECMAScript object
    val._iter || val._object ? printIteratorEntries(
      val.entries(),
      config,
      indentation,
      depth,
      refs,
      printer2
    ) : LAZY}}`;
  }
  return `${name + SPACE}[${val._iter || val._array || val._collection || val._iterable ? printIteratorValues(
    val.values(),
    config,
    indentation,
    depth,
    refs,
    printer2
  ) : LAZY}]`;
}
function printImmutableValues(val, config, indentation, depth, refs, printer2, type) {
  return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}[${printIteratorValues(
    val.values(),
    config,
    indentation,
    depth,
    refs,
    printer2
  )}]`;
}
const serialize$2 = (val, config, indentation, depth, refs, printer2) => {
  if (val[IS_MAP_SENTINEL]) {
    return printImmutableEntries(
      val,
      config,
      indentation,
      depth,
      refs,
      printer2,
      val[IS_ORDERED_SENTINEL] ? "OrderedMap" : "Map"
    );
  }
  if (val[IS_LIST_SENTINEL]) {
    return printImmutableValues(
      val,
      config,
      indentation,
      depth,
      refs,
      printer2,
      "List"
    );
  }
  if (val[IS_SET_SENTINEL]) {
    return printImmutableValues(
      val,
      config,
      indentation,
      depth,
      refs,
      printer2,
      val[IS_ORDERED_SENTINEL] ? "OrderedSet" : "Set"
    );
  }
  if (val[IS_STACK_SENTINEL]) {
    return printImmutableValues(
      val,
      config,
      indentation,
      depth,
      refs,
      printer2,
      "Stack"
    );
  }
  if (val[IS_SEQ_SENTINEL]) {
    return printImmutableSeq(val, config, indentation, depth, refs, printer2);
  }
  return printImmutableRecord(val, config, indentation, depth, refs, printer2);
};
const test$2 = (val) => val && (val[IS_ITERABLE_SENTINEL] === true || val[IS_RECORD_SENTINEL] === true);
const plugin$2 = { serialize: serialize$2, test: test$2 };
function getDefaultExportFromCjs$1(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var reactIs$1 = { exports: {} };
var reactIs_production = {};
/**
 * @license React
 * react-is.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_production;
function requireReactIs_production() {
  if (hasRequiredReactIs_production) return reactIs_production;
  hasRequiredReactIs_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
  var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function typeOf(object) {
    if ("object" === typeof object && null !== object) {
      var $$typeof = object.$$typeof;
      switch ($$typeof) {
        case REACT_ELEMENT_TYPE:
          switch (object = object.type, object) {
            case REACT_FRAGMENT_TYPE:
            case REACT_PROFILER_TYPE:
            case REACT_STRICT_MODE_TYPE:
            case REACT_SUSPENSE_TYPE:
            case REACT_SUSPENSE_LIST_TYPE:
              return object;
            default:
              switch (object = object && object.$$typeof, object) {
                case REACT_CONTEXT_TYPE:
                case REACT_FORWARD_REF_TYPE:
                case REACT_LAZY_TYPE:
                case REACT_MEMO_TYPE:
                  return object;
                case REACT_CONSUMER_TYPE:
                  return object;
                default:
                  return $$typeof;
              }
          }
        case REACT_PORTAL_TYPE:
          return $$typeof;
      }
    }
  }
  reactIs_production.ContextConsumer = REACT_CONSUMER_TYPE;
  reactIs_production.ContextProvider = REACT_CONTEXT_TYPE;
  reactIs_production.Element = REACT_ELEMENT_TYPE;
  reactIs_production.ForwardRef = REACT_FORWARD_REF_TYPE;
  reactIs_production.Fragment = REACT_FRAGMENT_TYPE;
  reactIs_production.Lazy = REACT_LAZY_TYPE;
  reactIs_production.Memo = REACT_MEMO_TYPE;
  reactIs_production.Portal = REACT_PORTAL_TYPE;
  reactIs_production.Profiler = REACT_PROFILER_TYPE;
  reactIs_production.StrictMode = REACT_STRICT_MODE_TYPE;
  reactIs_production.Suspense = REACT_SUSPENSE_TYPE;
  reactIs_production.SuspenseList = REACT_SUSPENSE_LIST_TYPE;
  reactIs_production.isContextConsumer = function(object) {
    return typeOf(object) === REACT_CONSUMER_TYPE;
  };
  reactIs_production.isContextProvider = function(object) {
    return typeOf(object) === REACT_CONTEXT_TYPE;
  };
  reactIs_production.isElement = function(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  };
  reactIs_production.isForwardRef = function(object) {
    return typeOf(object) === REACT_FORWARD_REF_TYPE;
  };
  reactIs_production.isFragment = function(object) {
    return typeOf(object) === REACT_FRAGMENT_TYPE;
  };
  reactIs_production.isLazy = function(object) {
    return typeOf(object) === REACT_LAZY_TYPE;
  };
  reactIs_production.isMemo = function(object) {
    return typeOf(object) === REACT_MEMO_TYPE;
  };
  reactIs_production.isPortal = function(object) {
    return typeOf(object) === REACT_PORTAL_TYPE;
  };
  reactIs_production.isProfiler = function(object) {
    return typeOf(object) === REACT_PROFILER_TYPE;
  };
  reactIs_production.isStrictMode = function(object) {
    return typeOf(object) === REACT_STRICT_MODE_TYPE;
  };
  reactIs_production.isSuspense = function(object) {
    return typeOf(object) === REACT_SUSPENSE_TYPE;
  };
  reactIs_production.isSuspenseList = function(object) {
    return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
  };
  reactIs_production.isValidElementType = function(type) {
    return "string" === typeof type || "function" === typeof type || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_OFFSCREEN_TYPE || "object" === typeof type && null !== type && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE || void 0 !== type.getModuleId) ? true : false;
  };
  reactIs_production.typeOf = typeOf;
  return reactIs_production;
}
var reactIs_development$1 = {};
/**
 * @license React
 * react-is.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_development$1;
function requireReactIs_development$1() {
  if (hasRequiredReactIs_development$1) return reactIs_development$1;
  hasRequiredReactIs_development$1 = 1;
  "production" !== process.env.NODE_ENV && function() {
    function typeOf(object) {
      if ("object" === typeof object && null !== object) {
        var $$typeof = object.$$typeof;
        switch ($$typeof) {
          case REACT_ELEMENT_TYPE:
            switch (object = object.type, object) {
              case REACT_FRAGMENT_TYPE:
              case REACT_PROFILER_TYPE:
              case REACT_STRICT_MODE_TYPE:
              case REACT_SUSPENSE_TYPE:
              case REACT_SUSPENSE_LIST_TYPE:
                return object;
              default:
                switch (object = object && object.$$typeof, object) {
                  case REACT_CONTEXT_TYPE:
                  case REACT_FORWARD_REF_TYPE:
                  case REACT_LAZY_TYPE:
                  case REACT_MEMO_TYPE:
                    return object;
                  case REACT_CONSUMER_TYPE:
                    return object;
                  default:
                    return $$typeof;
                }
            }
          case REACT_PORTAL_TYPE:
            return $$typeof;
        }
      }
    }
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
    reactIs_development$1.ContextConsumer = REACT_CONSUMER_TYPE;
    reactIs_development$1.ContextProvider = REACT_CONTEXT_TYPE;
    reactIs_development$1.Element = REACT_ELEMENT_TYPE;
    reactIs_development$1.ForwardRef = REACT_FORWARD_REF_TYPE;
    reactIs_development$1.Fragment = REACT_FRAGMENT_TYPE;
    reactIs_development$1.Lazy = REACT_LAZY_TYPE;
    reactIs_development$1.Memo = REACT_MEMO_TYPE;
    reactIs_development$1.Portal = REACT_PORTAL_TYPE;
    reactIs_development$1.Profiler = REACT_PROFILER_TYPE;
    reactIs_development$1.StrictMode = REACT_STRICT_MODE_TYPE;
    reactIs_development$1.Suspense = REACT_SUSPENSE_TYPE;
    reactIs_development$1.SuspenseList = REACT_SUSPENSE_LIST_TYPE;
    reactIs_development$1.isContextConsumer = function(object) {
      return typeOf(object) === REACT_CONSUMER_TYPE;
    };
    reactIs_development$1.isContextProvider = function(object) {
      return typeOf(object) === REACT_CONTEXT_TYPE;
    };
    reactIs_development$1.isElement = function(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    };
    reactIs_development$1.isForwardRef = function(object) {
      return typeOf(object) === REACT_FORWARD_REF_TYPE;
    };
    reactIs_development$1.isFragment = function(object) {
      return typeOf(object) === REACT_FRAGMENT_TYPE;
    };
    reactIs_development$1.isLazy = function(object) {
      return typeOf(object) === REACT_LAZY_TYPE;
    };
    reactIs_development$1.isMemo = function(object) {
      return typeOf(object) === REACT_MEMO_TYPE;
    };
    reactIs_development$1.isPortal = function(object) {
      return typeOf(object) === REACT_PORTAL_TYPE;
    };
    reactIs_development$1.isProfiler = function(object) {
      return typeOf(object) === REACT_PROFILER_TYPE;
    };
    reactIs_development$1.isStrictMode = function(object) {
      return typeOf(object) === REACT_STRICT_MODE_TYPE;
    };
    reactIs_development$1.isSuspense = function(object) {
      return typeOf(object) === REACT_SUSPENSE_TYPE;
    };
    reactIs_development$1.isSuspenseList = function(object) {
      return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
    };
    reactIs_development$1.isValidElementType = function(type) {
      return "string" === typeof type || "function" === typeof type || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_OFFSCREEN_TYPE || "object" === typeof type && null !== type && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE || void 0 !== type.getModuleId) ? true : false;
    };
    reactIs_development$1.typeOf = typeOf;
  }();
  return reactIs_development$1;
}
var hasRequiredReactIs$1;
function requireReactIs$1() {
  if (hasRequiredReactIs$1) return reactIs$1.exports;
  hasRequiredReactIs$1 = 1;
  if (process.env.NODE_ENV === "production") {
    reactIs$1.exports = requireReactIs_production();
  } else {
    reactIs$1.exports = requireReactIs_development$1();
  }
  return reactIs$1.exports;
}
var reactIsExports$1 = /* @__PURE__ */ requireReactIs$1();
var index$1 = /* @__PURE__ */ getDefaultExportFromCjs$1(reactIsExports$1);
var ReactIs19 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index$1
}, [reactIsExports$1]);
var reactIs = { exports: {} };
var reactIs_production_min = {};
/**
 * @license React
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_production_min;
function requireReactIs_production_min() {
  if (hasRequiredReactIs_production_min) return reactIs_production_min;
  hasRequiredReactIs_production_min = 1;
  var b = Symbol.for("react.element"), c = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), e = Symbol.for("react.strict_mode"), f = Symbol.for("react.profiler"), g = Symbol.for("react.provider"), h = Symbol.for("react.context"), k = Symbol.for("react.server_context"), l = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), n = Symbol.for("react.suspense_list"), p = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), t = Symbol.for("react.offscreen"), u;
  u = Symbol.for("react.module.reference");
  function v(a) {
    if ("object" === typeof a && null !== a) {
      var r = a.$$typeof;
      switch (r) {
        case b:
          switch (a = a.type, a) {
            case d:
            case f:
            case e:
            case m:
            case n:
              return a;
            default:
              switch (a = a && a.$$typeof, a) {
                case k:
                case h:
                case l:
                case q:
                case p:
                case g:
                  return a;
                default:
                  return r;
              }
          }
        case c:
          return r;
      }
    }
  }
  reactIs_production_min.ContextConsumer = h;
  reactIs_production_min.ContextProvider = g;
  reactIs_production_min.Element = b;
  reactIs_production_min.ForwardRef = l;
  reactIs_production_min.Fragment = d;
  reactIs_production_min.Lazy = q;
  reactIs_production_min.Memo = p;
  reactIs_production_min.Portal = c;
  reactIs_production_min.Profiler = f;
  reactIs_production_min.StrictMode = e;
  reactIs_production_min.Suspense = m;
  reactIs_production_min.SuspenseList = n;
  reactIs_production_min.isAsyncMode = function() {
    return false;
  };
  reactIs_production_min.isConcurrentMode = function() {
    return false;
  };
  reactIs_production_min.isContextConsumer = function(a) {
    return v(a) === h;
  };
  reactIs_production_min.isContextProvider = function(a) {
    return v(a) === g;
  };
  reactIs_production_min.isElement = function(a) {
    return "object" === typeof a && null !== a && a.$$typeof === b;
  };
  reactIs_production_min.isForwardRef = function(a) {
    return v(a) === l;
  };
  reactIs_production_min.isFragment = function(a) {
    return v(a) === d;
  };
  reactIs_production_min.isLazy = function(a) {
    return v(a) === q;
  };
  reactIs_production_min.isMemo = function(a) {
    return v(a) === p;
  };
  reactIs_production_min.isPortal = function(a) {
    return v(a) === c;
  };
  reactIs_production_min.isProfiler = function(a) {
    return v(a) === f;
  };
  reactIs_production_min.isStrictMode = function(a) {
    return v(a) === e;
  };
  reactIs_production_min.isSuspense = function(a) {
    return v(a) === m;
  };
  reactIs_production_min.isSuspenseList = function(a) {
    return v(a) === n;
  };
  reactIs_production_min.isValidElementType = function(a) {
    return "string" === typeof a || "function" === typeof a || a === d || a === f || a === e || a === m || a === n || a === t || "object" === typeof a && null !== a && (a.$$typeof === q || a.$$typeof === p || a.$$typeof === g || a.$$typeof === h || a.$$typeof === l || a.$$typeof === u || void 0 !== a.getModuleId) ? true : false;
  };
  reactIs_production_min.typeOf = v;
  return reactIs_production_min;
}
var reactIs_development = {};
/**
 * @license React
 * react-is.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactIs_development;
function requireReactIs_development() {
  if (hasRequiredReactIs_development) return reactIs_development;
  hasRequiredReactIs_development = 1;
  if (process.env.NODE_ENV !== "production") {
    (function() {
      var REACT_ELEMENT_TYPE = Symbol.for("react.element");
      var REACT_PORTAL_TYPE = Symbol.for("react.portal");
      var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
      var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
      var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
      var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
      var REACT_CONTEXT_TYPE = Symbol.for("react.context");
      var REACT_SERVER_CONTEXT_TYPE = Symbol.for("react.server_context");
      var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
      var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
      var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
      var REACT_MEMO_TYPE = Symbol.for("react.memo");
      var REACT_LAZY_TYPE = Symbol.for("react.lazy");
      var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
      var enableScopeAPI = false;
      var enableCacheElement = false;
      var enableTransitionTracing = false;
      var enableLegacyHidden = false;
      var enableDebugTracing = false;
      var REACT_MODULE_REFERENCE;
      {
        REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
      }
      function isValidElementType(type) {
        if (typeof type === "string" || typeof type === "function") {
          return true;
        }
        if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
          return true;
        }
        if (typeof type === "object" && type !== null) {
          if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
          // types supported by any Flight configuration anywhere since
          // we don't know which Flight build this will end up being used
          // with.
          type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
            return true;
          }
        }
        return false;
      }
      function typeOf(object) {
        if (typeof object === "object" && object !== null) {
          var $$typeof = object.$$typeof;
          switch ($$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = object.type;
              switch (type) {
                case REACT_FRAGMENT_TYPE:
                case REACT_PROFILER_TYPE:
                case REACT_STRICT_MODE_TYPE:
                case REACT_SUSPENSE_TYPE:
                case REACT_SUSPENSE_LIST_TYPE:
                  return type;
                default:
                  var $$typeofType = type && type.$$typeof;
                  switch ($$typeofType) {
                    case REACT_SERVER_CONTEXT_TYPE:
                    case REACT_CONTEXT_TYPE:
                    case REACT_FORWARD_REF_TYPE:
                    case REACT_LAZY_TYPE:
                    case REACT_MEMO_TYPE:
                    case REACT_PROVIDER_TYPE:
                      return $$typeofType;
                    default:
                      return $$typeof;
                  }
              }
            case REACT_PORTAL_TYPE:
              return $$typeof;
          }
        }
        return void 0;
      }
      var ContextConsumer = REACT_CONTEXT_TYPE;
      var ContextProvider = REACT_PROVIDER_TYPE;
      var Element = REACT_ELEMENT_TYPE;
      var ForwardRef = REACT_FORWARD_REF_TYPE;
      var Fragment = REACT_FRAGMENT_TYPE;
      var Lazy = REACT_LAZY_TYPE;
      var Memo = REACT_MEMO_TYPE;
      var Portal = REACT_PORTAL_TYPE;
      var Profiler = REACT_PROFILER_TYPE;
      var StrictMode = REACT_STRICT_MODE_TYPE;
      var Suspense = REACT_SUSPENSE_TYPE;
      var SuspenseList = REACT_SUSPENSE_LIST_TYPE;
      var hasWarnedAboutDeprecatedIsAsyncMode = false;
      var hasWarnedAboutDeprecatedIsConcurrentMode = false;
      function isAsyncMode(object) {
        {
          if (!hasWarnedAboutDeprecatedIsAsyncMode) {
            hasWarnedAboutDeprecatedIsAsyncMode = true;
            console["warn"]("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 18+.");
          }
        }
        return false;
      }
      function isConcurrentMode(object) {
        {
          if (!hasWarnedAboutDeprecatedIsConcurrentMode) {
            hasWarnedAboutDeprecatedIsConcurrentMode = true;
            console["warn"]("The ReactIs.isConcurrentMode() alias has been deprecated, and will be removed in React 18+.");
          }
        }
        return false;
      }
      function isContextConsumer(object) {
        return typeOf(object) === REACT_CONTEXT_TYPE;
      }
      function isContextProvider(object) {
        return typeOf(object) === REACT_PROVIDER_TYPE;
      }
      function isElement(object) {
        return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function isForwardRef(object) {
        return typeOf(object) === REACT_FORWARD_REF_TYPE;
      }
      function isFragment(object) {
        return typeOf(object) === REACT_FRAGMENT_TYPE;
      }
      function isLazy(object) {
        return typeOf(object) === REACT_LAZY_TYPE;
      }
      function isMemo(object) {
        return typeOf(object) === REACT_MEMO_TYPE;
      }
      function isPortal(object) {
        return typeOf(object) === REACT_PORTAL_TYPE;
      }
      function isProfiler(object) {
        return typeOf(object) === REACT_PROFILER_TYPE;
      }
      function isStrictMode(object) {
        return typeOf(object) === REACT_STRICT_MODE_TYPE;
      }
      function isSuspense(object) {
        return typeOf(object) === REACT_SUSPENSE_TYPE;
      }
      function isSuspenseList(object) {
        return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
      }
      reactIs_development.ContextConsumer = ContextConsumer;
      reactIs_development.ContextProvider = ContextProvider;
      reactIs_development.Element = Element;
      reactIs_development.ForwardRef = ForwardRef;
      reactIs_development.Fragment = Fragment;
      reactIs_development.Lazy = Lazy;
      reactIs_development.Memo = Memo;
      reactIs_development.Portal = Portal;
      reactIs_development.Profiler = Profiler;
      reactIs_development.StrictMode = StrictMode;
      reactIs_development.Suspense = Suspense;
      reactIs_development.SuspenseList = SuspenseList;
      reactIs_development.isAsyncMode = isAsyncMode;
      reactIs_development.isConcurrentMode = isConcurrentMode;
      reactIs_development.isContextConsumer = isContextConsumer;
      reactIs_development.isContextProvider = isContextProvider;
      reactIs_development.isElement = isElement;
      reactIs_development.isForwardRef = isForwardRef;
      reactIs_development.isFragment = isFragment;
      reactIs_development.isLazy = isLazy;
      reactIs_development.isMemo = isMemo;
      reactIs_development.isPortal = isPortal;
      reactIs_development.isProfiler = isProfiler;
      reactIs_development.isStrictMode = isStrictMode;
      reactIs_development.isSuspense = isSuspense;
      reactIs_development.isSuspenseList = isSuspenseList;
      reactIs_development.isValidElementType = isValidElementType;
      reactIs_development.typeOf = typeOf;
    })();
  }
  return reactIs_development;
}
var hasRequiredReactIs;
function requireReactIs() {
  if (hasRequiredReactIs) return reactIs.exports;
  hasRequiredReactIs = 1;
  if (process.env.NODE_ENV === "production") {
    reactIs.exports = requireReactIs_production_min();
  } else {
    reactIs.exports = requireReactIs_development();
  }
  return reactIs.exports;
}
var reactIsExports = requireReactIs();
var index = /* @__PURE__ */ getDefaultExportFromCjs$1(reactIsExports);
var ReactIs18 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [reactIsExports]);
const reactIsMethods = [
  "isAsyncMode",
  "isConcurrentMode",
  "isContextConsumer",
  "isContextProvider",
  "isElement",
  "isForwardRef",
  "isFragment",
  "isLazy",
  "isMemo",
  "isPortal",
  "isProfiler",
  "isStrictMode",
  "isSuspense",
  "isSuspenseList",
  "isValidElementType"
];
const ReactIs = Object.fromEntries(
  reactIsMethods.map((m) => [m, (v) => ReactIs18[m](v) || ReactIs19[m](v)])
);
function getChildren(arg, children = []) {
  if (Array.isArray(arg)) {
    for (const item of arg) {
      getChildren(item, children);
    }
  } else if (arg != null && arg !== false && arg !== "") {
    children.push(arg);
  }
  return children;
}
function getType$2(element) {
  const type = element.type;
  if (typeof type === "string") {
    return type;
  }
  if (typeof type === "function") {
    return type.displayName || type.name || "Unknown";
  }
  if (ReactIs.isFragment(element)) {
    return "React.Fragment";
  }
  if (ReactIs.isSuspense(element)) {
    return "React.Suspense";
  }
  if (typeof type === "object" && type !== null) {
    if (ReactIs.isContextProvider(element)) {
      return "Context.Provider";
    }
    if (ReactIs.isContextConsumer(element)) {
      return "Context.Consumer";
    }
    if (ReactIs.isForwardRef(element)) {
      if (type.displayName) {
        return type.displayName;
      }
      const functionName = type.render.displayName || type.render.name || "";
      return functionName === "" ? "ForwardRef" : `ForwardRef(${functionName})`;
    }
    if (ReactIs.isMemo(element)) {
      const functionName = type.displayName || type.type.displayName || type.type.name || "";
      return functionName === "" ? "Memo" : `Memo(${functionName})`;
    }
  }
  return "UNDEFINED";
}
function getPropKeys$1(element) {
  const { props } = element;
  return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
}
const serialize$1 = (element, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(getType$2(element), config) : printElement(
  getType$2(element),
  printProps(
    getPropKeys$1(element),
    element.props,
    config,
    indentation + config.indent,
    depth,
    refs,
    printer2
  ),
  printChildren(
    getChildren(element.props.children),
    config,
    indentation + config.indent,
    depth,
    refs,
    printer2
  ),
  config,
  indentation
);
const test$1 = (val) => val != null && ReactIs.isElement(val);
const plugin$1 = { serialize: serialize$1, test: test$1 };
const testSymbol = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.test.json") : 245830487;
function getPropKeys(object) {
  const { props } = object;
  return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
}
const serialize = (object, config, indentation, depth, refs, printer2) => ++depth > config.maxDepth ? printElementAsLeaf(object.type, config) : printElement(
  object.type,
  object.props ? printProps(
    getPropKeys(object),
    object.props,
    config,
    indentation + config.indent,
    depth,
    refs,
    printer2
  ) : "",
  object.children ? printChildren(
    object.children,
    config,
    indentation + config.indent,
    depth,
    refs,
    printer2
  ) : "",
  config,
  indentation
);
const test = (val) => val && val.$$typeof === testSymbol;
const plugin = { serialize, test };
const toString$1 = Object.prototype.toString;
const toISOString = Date.prototype.toISOString;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
function getConstructorName(val) {
  return typeof val.constructor === "function" && val.constructor.name || "Object";
}
function isWindow(val) {
  return typeof window !== "undefined" && val === window;
}
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
const NEWLINE_REGEXP = /\n/g;
class PrettyFormatPluginError extends Error {
  constructor(message, stack) {
    super(message);
    this.stack = stack;
    this.name = this.constructor.name;
  }
}
function isToStringedArrayType(toStringed) {
  return toStringed === "[object Array]" || toStringed === "[object ArrayBuffer]" || toStringed === "[object DataView]" || toStringed === "[object Float32Array]" || toStringed === "[object Float64Array]" || toStringed === "[object Int8Array]" || toStringed === "[object Int16Array]" || toStringed === "[object Int32Array]" || toStringed === "[object Uint8Array]" || toStringed === "[object Uint8ClampedArray]" || toStringed === "[object Uint16Array]" || toStringed === "[object Uint32Array]";
}
function printNumber(val) {
  return Object.is(val, -0) ? "-0" : String(val);
}
function printBigInt(val) {
  return String(`${val}n`);
}
function printFunction(val, printFunctionName) {
  if (!printFunctionName) {
    return "[Function]";
  }
  return `[Function ${val.name || "anonymous"}]`;
}
function printSymbol(val) {
  return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
}
function printError(val) {
  return `[${errorToString.call(val)}]`;
}
function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
  if (val === true || val === false) {
    return `${val}`;
  }
  if (val === void 0) {
    return "undefined";
  }
  if (val === null) {
    return "null";
  }
  const typeOf = typeof val;
  if (typeOf === "number") {
    return printNumber(val);
  }
  if (typeOf === "bigint") {
    return printBigInt(val);
  }
  if (typeOf === "string") {
    if (escapeString) {
      return `"${val.replaceAll(/"|\\/g, "\\$&")}"`;
    }
    return `"${val}"`;
  }
  if (typeOf === "function") {
    return printFunction(val, printFunctionName);
  }
  if (typeOf === "symbol") {
    return printSymbol(val);
  }
  const toStringed = toString$1.call(val);
  if (toStringed === "[object WeakMap]") {
    return "WeakMap {}";
  }
  if (toStringed === "[object WeakSet]") {
    return "WeakSet {}";
  }
  if (toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]") {
    return printFunction(val, printFunctionName);
  }
  if (toStringed === "[object Symbol]") {
    return printSymbol(val);
  }
  if (toStringed === "[object Date]") {
    return Number.isNaN(+val) ? "Date { NaN }" : toISOString.call(val);
  }
  if (toStringed === "[object Error]") {
    return printError(val);
  }
  if (toStringed === "[object RegExp]") {
    if (escapeRegex) {
      return regExpToString.call(val).replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&");
    }
    return regExpToString.call(val);
  }
  if (val instanceof Error) {
    return printError(val);
  }
  return null;
}
function printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON) {
  if (refs.includes(val)) {
    return "[Circular]";
  }
  refs = [...refs];
  refs.push(val);
  const hitMaxDepth = ++depth > config.maxDepth;
  const min = config.min;
  if (config.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON === "function" && !hasCalledToJSON) {
    return printer(val.toJSON(), config, indentation, depth, refs, true);
  }
  const toStringed = toString$1.call(val);
  if (toStringed === "[object Arguments]") {
    return hitMaxDepth ? "[Arguments]" : `${min ? "" : "Arguments "}[${printListItems(
      val,
      config,
      indentation,
      depth,
      refs,
      printer
    )}]`;
  }
  if (isToStringedArrayType(toStringed)) {
    return hitMaxDepth ? `[${val.constructor.name}]` : `${min ? "" : !config.printBasicPrototype && val.constructor.name === "Array" ? "" : `${val.constructor.name} `}[${printListItems(val, config, indentation, depth, refs, printer)}]`;
  }
  if (toStringed === "[object Map]") {
    return hitMaxDepth ? "[Map]" : `Map {${printIteratorEntries(
      val.entries(),
      config,
      indentation,
      depth,
      refs,
      printer,
      " => "
    )}}`;
  }
  if (toStringed === "[object Set]") {
    return hitMaxDepth ? "[Set]" : `Set {${printIteratorValues(
      val.values(),
      config,
      indentation,
      depth,
      refs,
      printer
    )}}`;
  }
  return hitMaxDepth || isWindow(val) ? `[${getConstructorName(val)}]` : `${min ? "" : !config.printBasicPrototype && getConstructorName(val) === "Object" ? "" : `${getConstructorName(val)} `}{${printObjectProperties(
    val,
    config,
    indentation,
    depth,
    refs,
    printer
  )}}`;
}
const ErrorPlugin = {
  test: (val) => val && val instanceof Error,
  serialize(val, config, indentation, depth, refs, printer2) {
    if (refs.includes(val)) {
      return "[Circular]";
    }
    refs = [...refs, val];
    const hitMaxDepth = ++depth > config.maxDepth;
    const { message, cause, ...rest } = val;
    const entries = {
      message,
      ...typeof cause !== "undefined" ? { cause } : {},
      ...val instanceof AggregateError ? { errors: val.errors } : {},
      ...rest
    };
    const name = val.name !== "Error" ? val.name : getConstructorName(val);
    return hitMaxDepth ? `[${name}]` : `${name} {${printIteratorEntries(
      Object.entries(entries).values(),
      config,
      indentation,
      depth,
      refs,
      printer2
    )}}`;
  }
};
function isNewPlugin(plugin2) {
  return plugin2.serialize != null;
}
function printPlugin(plugin2, val, config, indentation, depth, refs) {
  let printed;
  try {
    printed = isNewPlugin(plugin2) ? plugin2.serialize(val, config, indentation, depth, refs, printer) : plugin2.print(
      val,
      (valChild) => printer(valChild, config, indentation, depth, refs),
      (str) => {
        const indentationNext = indentation + config.indent;
        return indentationNext + str.replaceAll(NEWLINE_REGEXP, `
${indentationNext}`);
      },
      {
        edgeSpacing: config.spacingOuter,
        min: config.min,
        spacing: config.spacingInner
      },
      config.colors
    );
  } catch (error) {
    throw new PrettyFormatPluginError(error.message, error.stack);
  }
  if (typeof printed !== "string") {
    throw new TypeError(
      `pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`
    );
  }
  return printed;
}
function findPlugin(plugins2, val) {
  for (const plugin2 of plugins2) {
    try {
      if (plugin2.test(val)) {
        return plugin2;
      }
    } catch (error) {
      throw new PrettyFormatPluginError(error.message, error.stack);
    }
  }
  return null;
}
function printer(val, config, indentation, depth, refs, hasCalledToJSON) {
  const plugin2 = findPlugin(config.plugins, val);
  if (plugin2 !== null) {
    return printPlugin(plugin2, val, config, indentation, depth, refs);
  }
  const basicResult = printBasicValue(
    val,
    config.printFunctionName,
    config.escapeRegex,
    config.escapeString
  );
  if (basicResult !== null) {
    return basicResult;
  }
  return printComplexValue(
    val,
    config,
    indentation,
    depth,
    refs,
    hasCalledToJSON
  );
}
const DEFAULT_THEME = {
  comment: "gray",
  content: "reset",
  prop: "yellow",
  tag: "cyan",
  value: "green"
};
const DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME);
const DEFAULT_OPTIONS = {
  callToJSON: true,
  compareKeys: void 0,
  escapeRegex: false,
  escapeString: true,
  highlight: false,
  indent: 2,
  maxDepth: Number.POSITIVE_INFINITY,
  maxWidth: Number.POSITIVE_INFINITY,
  min: false,
  plugins: [],
  printBasicPrototype: true,
  printFunctionName: true,
  theme: DEFAULT_THEME
};
function validateOptions(options) {
  for (const key of Object.keys(options)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key)) {
      throw new Error(`pretty-format: Unknown option "${key}".`);
    }
  }
  if (options.min && options.indent !== void 0 && options.indent !== 0) {
    throw new Error(
      'pretty-format: Options "min" and "indent" cannot be used together.'
    );
  }
}
function getColorsHighlight() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    const value = DEFAULT_THEME[key];
    const color = value && s[value];
    if (color && typeof color.close === "string" && typeof color.open === "string") {
      colors[key] = color;
    } else {
      throw new Error(
        `pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`
      );
    }
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getColorsEmpty() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    colors[key] = { close: "", open: "" };
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getPrintFunctionName(options) {
  return (options == null ? void 0 : options.printFunctionName) ?? DEFAULT_OPTIONS.printFunctionName;
}
function getEscapeRegex(options) {
  return (options == null ? void 0 : options.escapeRegex) ?? DEFAULT_OPTIONS.escapeRegex;
}
function getEscapeString(options) {
  return (options == null ? void 0 : options.escapeString) ?? DEFAULT_OPTIONS.escapeString;
}
function getConfig(options) {
  return {
    callToJSON: (options == null ? void 0 : options.callToJSON) ?? DEFAULT_OPTIONS.callToJSON,
    colors: (options == null ? void 0 : options.highlight) ? getColorsHighlight() : getColorsEmpty(),
    compareKeys: typeof (options == null ? void 0 : options.compareKeys) === "function" || (options == null ? void 0 : options.compareKeys) === null ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
    escapeRegex: getEscapeRegex(options),
    escapeString: getEscapeString(options),
    indent: (options == null ? void 0 : options.min) ? "" : createIndent((options == null ? void 0 : options.indent) ?? DEFAULT_OPTIONS.indent),
    maxDepth: (options == null ? void 0 : options.maxDepth) ?? DEFAULT_OPTIONS.maxDepth,
    maxWidth: (options == null ? void 0 : options.maxWidth) ?? DEFAULT_OPTIONS.maxWidth,
    min: (options == null ? void 0 : options.min) ?? DEFAULT_OPTIONS.min,
    plugins: (options == null ? void 0 : options.plugins) ?? DEFAULT_OPTIONS.plugins,
    printBasicPrototype: (options == null ? void 0 : options.printBasicPrototype) ?? true,
    printFunctionName: getPrintFunctionName(options),
    spacingInner: (options == null ? void 0 : options.min) ? " " : "\n",
    spacingOuter: (options == null ? void 0 : options.min) ? "" : "\n"
  };
}
function createIndent(indent) {
  return Array.from({ length: indent + 1 }).join(" ");
}
function format$1(val, options) {
  if (options) {
    validateOptions(options);
    if (options.plugins) {
      const plugin2 = findPlugin(options.plugins, val);
      if (plugin2 !== null) {
        return printPlugin(plugin2, val, getConfig(options), "", 0, []);
      }
    }
  }
  const basicResult = printBasicValue(
    val,
    getPrintFunctionName(options),
    getEscapeRegex(options),
    getEscapeString(options)
  );
  if (basicResult !== null) {
    return basicResult;
  }
  return printComplexValue(val, getConfig(options), "", 0, []);
}
const plugins = {
  AsymmetricMatcher: plugin$5,
  DOMCollection: plugin$4,
  DOMElement: plugin$3,
  Immutable: plugin$2,
  ReactElement: plugin$1,
  ReactTestComponent: plugin,
  Error: ErrorPlugin
};

const ansiColors = {
    bold: ['1', '22'],
    dim: ['2', '22'],
    italic: ['3', '23'],
    underline: ['4', '24'],
    // 5 & 6 are blinking
    inverse: ['7', '27'],
    hidden: ['8', '28'],
    strike: ['9', '29'],
    // 10-20 are fonts
    // 21-29 are resets for 1-9
    black: ['30', '39'],
    red: ['31', '39'],
    green: ['32', '39'],
    yellow: ['33', '39'],
    blue: ['34', '39'],
    magenta: ['35', '39'],
    cyan: ['36', '39'],
    white: ['37', '39'],
    brightblack: ['30;1', '39'],
    brightred: ['31;1', '39'],
    brightgreen: ['32;1', '39'],
    brightyellow: ['33;1', '39'],
    brightblue: ['34;1', '39'],
    brightmagenta: ['35;1', '39'],
    brightcyan: ['36;1', '39'],
    brightwhite: ['37;1', '39'],
    grey: ['90', '39'],
};
const styles = {
    special: 'cyan',
    number: 'yellow',
    bigint: 'yellow',
    boolean: 'yellow',
    undefined: 'grey',
    null: 'bold',
    string: 'green',
    symbol: 'green',
    date: 'magenta',
    regexp: 'red',
};
const truncator = '…';
function colorise(value, styleType) {
    const color = ansiColors[styles[styleType]] || ansiColors[styleType] || '';
    if (!color) {
        return String(value);
    }
    return `\u001b[${color[0]}m${String(value)}\u001b[${color[1]}m`;
}
function normaliseOptions({ showHidden = false, depth = 2, colors = false, customInspect = true, showProxy = false, maxArrayLength = Infinity, breakLength = Infinity, seen = [], 
// eslint-disable-next-line no-shadow
truncate = Infinity, stylize = String, } = {}, inspect) {
    const options = {
        showHidden: Boolean(showHidden),
        depth: Number(depth),
        colors: Boolean(colors),
        customInspect: Boolean(customInspect),
        showProxy: Boolean(showProxy),
        maxArrayLength: Number(maxArrayLength),
        breakLength: Number(breakLength),
        truncate: Number(truncate),
        seen,
        inspect,
        stylize,
    };
    if (options.colors) {
        options.stylize = colorise;
    }
    return options;
}
function isHighSurrogate(char) {
    return char >= '\ud800' && char <= '\udbff';
}
function truncate(string, length, tail = truncator) {
    string = String(string);
    const tailLength = tail.length;
    const stringLength = string.length;
    if (tailLength > length && stringLength > tailLength) {
        return tail;
    }
    if (stringLength > length && stringLength > tailLength) {
        let end = length - tailLength;
        if (end > 0 && isHighSurrogate(string[end - 1])) {
            end = end - 1;
        }
        return `${string.slice(0, end)}${tail}`;
    }
    return string;
}
// eslint-disable-next-line complexity
function inspectList(list, options, inspectItem, separator = ', ') {
    inspectItem = inspectItem || options.inspect;
    const size = list.length;
    if (size === 0)
        return '';
    const originalLength = options.truncate;
    let output = '';
    let peek = '';
    let truncated = '';
    for (let i = 0; i < size; i += 1) {
        const last = i + 1 === list.length;
        const secondToLast = i + 2 === list.length;
        truncated = `${truncator}(${list.length - i})`;
        const value = list[i];
        // If there is more than one remaining we need to account for a separator of `, `
        options.truncate = originalLength - output.length - (last ? 0 : separator.length);
        const string = peek || inspectItem(value, options) + (last ? '' : separator);
        const nextLength = output.length + string.length;
        const truncatedLength = nextLength + truncated.length;
        // If this is the last element, and adding it would
        // take us over length, but adding the truncator wouldn't - then break now
        if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
            break;
        }
        // If this isn't the last or second to last element to scan,
        // but the string is already over length then break here
        if (!last && !secondToLast && truncatedLength > originalLength) {
            break;
        }
        // Peek at the next string to determine if we should
        // break early before adding this item to the output
        peek = last ? '' : inspectItem(list[i + 1], options) + (secondToLast ? '' : separator);
        // If we have one element left, but this element and
        // the next takes over length, the break early
        if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
            break;
        }
        output += string;
        // If the next element takes us to length -
        // but there are more after that, then we should truncate now
        if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
            truncated = `${truncator}(${list.length - i - 1})`;
            break;
        }
        truncated = '';
    }
    return `${output}${truncated}`;
}
function quoteComplexKey(key) {
    if (key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
        return key;
    }
    return JSON.stringify(key)
        .replace(/'/g, "\\'")
        .replace(/\\"/g, '"')
        .replace(/(^"|"$)/g, "'");
}
function inspectProperty([key, value], options) {
    options.truncate -= 2;
    if (typeof key === 'string') {
        key = quoteComplexKey(key);
    }
    else if (typeof key !== 'number') {
        key = `[${options.inspect(key, options)}]`;
    }
    options.truncate -= key.length;
    value = options.inspect(value, options);
    return `${key}: ${value}`;
}

function inspectArray(array, options) {
    // Object.keys will always output the Array indices first, so we can slice by
    // `array.length` to get non-index properties
    const nonIndexProperties = Object.keys(array).slice(array.length);
    if (!array.length && !nonIndexProperties.length)
        return '[]';
    options.truncate -= 4;
    const listContents = inspectList(array, options);
    options.truncate -= listContents.length;
    let propertyContents = '';
    if (nonIndexProperties.length) {
        propertyContents = inspectList(nonIndexProperties.map(key => [key, array[key]]), options, inspectProperty);
    }
    return `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ''} ]`;
}

const getArrayName = (array) => {
    // We need to special case Node.js' Buffers, which report to be Uint8Array
    // @ts-ignore
    if (typeof Buffer === 'function' && array instanceof Buffer) {
        return 'Buffer';
    }
    if (array[Symbol.toStringTag]) {
        return array[Symbol.toStringTag];
    }
    return array.constructor.name;
};
function inspectTypedArray(array, options) {
    const name = getArrayName(array);
    options.truncate -= name.length + 4;
    // Object.keys will always output the Array indices first, so we can slice by
    // `array.length` to get non-index properties
    const nonIndexProperties = Object.keys(array).slice(array.length);
    if (!array.length && !nonIndexProperties.length)
        return `${name}[]`;
    // As we know TypedArrays only contain Unsigned Integers, we can skip inspecting each one and simply
    // stylise the toString() value of them
    let output = '';
    for (let i = 0; i < array.length; i++) {
        const string = `${options.stylize(truncate(array[i], options.truncate), 'number')}${i === array.length - 1 ? '' : ', '}`;
        options.truncate -= string.length;
        if (array[i] !== array.length && options.truncate <= 3) {
            output += `${truncator}(${array.length - array[i] + 1})`;
            break;
        }
        output += string;
    }
    let propertyContents = '';
    if (nonIndexProperties.length) {
        propertyContents = inspectList(nonIndexProperties.map(key => [key, array[key]]), options, inspectProperty);
    }
    return `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ''} ]`;
}

function inspectDate(dateObject, options) {
    const stringRepresentation = dateObject.toJSON();
    if (stringRepresentation === null) {
        return 'Invalid Date';
    }
    const split = stringRepresentation.split('T');
    const date = split[0];
    // If we need to - truncate the time portion, but never the date
    return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, 'date');
}

function inspectFunction(func, options) {
    const functionType = func[Symbol.toStringTag] || 'Function';
    const name = func.name;
    if (!name) {
        return options.stylize(`[${functionType}]`, 'special');
    }
    return options.stylize(`[${functionType} ${truncate(name, options.truncate - 11)}]`, 'special');
}

function inspectMapEntry([key, value], options) {
    options.truncate -= 4;
    key = options.inspect(key, options);
    options.truncate -= key.length;
    value = options.inspect(value, options);
    return `${key} => ${value}`;
}
// IE11 doesn't support `map.entries()`
function mapToEntries(map) {
    const entries = [];
    map.forEach((value, key) => {
        entries.push([key, value]);
    });
    return entries;
}
function inspectMap(map, options) {
    if (map.size === 0)
        return 'Map{}';
    options.truncate -= 7;
    return `Map{ ${inspectList(mapToEntries(map), options, inspectMapEntry)} }`;
}

const isNaN = Number.isNaN || (i => i !== i); // eslint-disable-line no-self-compare
function inspectNumber(number, options) {
    if (isNaN(number)) {
        return options.stylize('NaN', 'number');
    }
    if (number === Infinity) {
        return options.stylize('Infinity', 'number');
    }
    if (number === -Infinity) {
        return options.stylize('-Infinity', 'number');
    }
    if (number === 0) {
        return options.stylize(1 / number === Infinity ? '+0' : '-0', 'number');
    }
    return options.stylize(truncate(String(number), options.truncate), 'number');
}

function inspectBigInt(number, options) {
    let nums = truncate(number.toString(), options.truncate - 1);
    if (nums !== truncator)
        nums += 'n';
    return options.stylize(nums, 'bigint');
}

function inspectRegExp(value, options) {
    const flags = value.toString().split('/')[2];
    const sourceLength = options.truncate - (2 + flags.length);
    const source = value.source;
    return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, 'regexp');
}

// IE11 doesn't support `Array.from(set)`
function arrayFromSet(set) {
    const values = [];
    set.forEach(value => {
        values.push(value);
    });
    return values;
}
function inspectSet(set, options) {
    if (set.size === 0)
        return 'Set{}';
    options.truncate -= 7;
    return `Set{ ${inspectList(arrayFromSet(set), options)} }`;
}

const stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5" +
    '\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]', 'g');
const escapeCharacters = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    "'": "\\'",
    '\\': '\\\\',
};
const hex = 16;
function escape(char) {
    return (escapeCharacters[char] ||
        `\\u${`0000${char.charCodeAt(0).toString(hex)}`.slice(-4)}`);
}
function inspectString(string, options) {
    if (stringEscapeChars.test(string)) {
        string = string.replace(stringEscapeChars, escape);
    }
    return options.stylize(`'${truncate(string, options.truncate - 2)}'`, 'string');
}

function inspectSymbol(value) {
    if ('description' in Symbol.prototype) {
        return value.description ? `Symbol(${value.description})` : 'Symbol()';
    }
    return value.toString();
}

let getPromiseValue = () => 'Promise{…}';
try {
    // @ts-ignore
    const { getPromiseDetails, kPending, kRejected } = process.binding('util');
    if (Array.isArray(getPromiseDetails(Promise.resolve()))) {
        getPromiseValue = (value, options) => {
            const [state, innerValue] = getPromiseDetails(value);
            if (state === kPending) {
                return 'Promise{<pending>}';
            }
            return `Promise${state === kRejected ? '!' : ''}{${options.inspect(innerValue, options)}}`;
        };
    }
}
catch (notNode) {
    /* ignore */
}

function inspectObject$1(object, options) {
    const properties = Object.getOwnPropertyNames(object);
    const symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];
    if (properties.length === 0 && symbols.length === 0) {
        return '{}';
    }
    options.truncate -= 4;
    options.seen = options.seen || [];
    if (options.seen.includes(object)) {
        return '[Circular]';
    }
    options.seen.push(object);
    const propertyContents = inspectList(properties.map(key => [key, object[key]]), options, inspectProperty);
    const symbolContents = inspectList(symbols.map(key => [key, object[key]]), options, inspectProperty);
    options.seen.pop();
    let sep = '';
    if (propertyContents && symbolContents) {
        sep = ', ';
    }
    return `{ ${propertyContents}${sep}${symbolContents} }`;
}

const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag ? Symbol.toStringTag : false;
function inspectClass(value, options) {
    let name = '';
    if (toStringTag && toStringTag in value) {
        name = value[toStringTag];
    }
    name = name || value.constructor.name;
    // Babel transforms anonymous classes to the name `_class`
    if (!name || name === '_class') {
        name = '<Anonymous Class>';
    }
    options.truncate -= name.length;
    return `${name}${inspectObject$1(value, options)}`;
}

function inspectArguments(args, options) {
    if (args.length === 0)
        return 'Arguments[]';
    options.truncate -= 13;
    return `Arguments[ ${inspectList(args, options)} ]`;
}

const errorKeys = [
    'stack',
    'line',
    'column',
    'name',
    'message',
    'fileName',
    'lineNumber',
    'columnNumber',
    'number',
    'description',
    'cause',
];
function inspectObject(error, options) {
    const properties = Object.getOwnPropertyNames(error).filter(key => errorKeys.indexOf(key) === -1);
    const name = error.name;
    options.truncate -= name.length;
    let message = '';
    if (typeof error.message === 'string') {
        message = truncate(error.message, options.truncate);
    }
    else {
        properties.unshift('message');
    }
    message = message ? `: ${message}` : '';
    options.truncate -= message.length + 5;
    options.seen = options.seen || [];
    if (options.seen.includes(error)) {
        return '[Circular]';
    }
    options.seen.push(error);
    const propertyContents = inspectList(properties.map(key => [key, error[key]]), options, inspectProperty);
    return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ''}`;
}

function inspectAttribute([key, value], options) {
    options.truncate -= 3;
    if (!value) {
        return `${options.stylize(String(key), 'yellow')}`;
    }
    return `${options.stylize(String(key), 'yellow')}=${options.stylize(`"${value}"`, 'string')}`;
}
// @ts-ignore (Deno doesn't have Element)
function inspectHTMLCollection(collection, options) {
    // eslint-disable-next-line no-use-before-define
    return inspectList(collection, options, inspectHTML, '\n');
}
// @ts-ignore (Deno doesn't have Element)
function inspectHTML(element, options) {
    const properties = element.getAttributeNames();
    const name = element.tagName.toLowerCase();
    const head = options.stylize(`<${name}`, 'special');
    const headClose = options.stylize(`>`, 'special');
    const tail = options.stylize(`</${name}>`, 'special');
    options.truncate -= name.length * 2 + 5;
    let propertyContents = '';
    if (properties.length > 0) {
        propertyContents += ' ';
        propertyContents += inspectList(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute, ' ');
    }
    options.truncate -= propertyContents.length;
    const truncate = options.truncate;
    let children = inspectHTMLCollection(element.children, options);
    if (children && children.length > truncate) {
        children = `${truncator}(${element.children.length})`;
    }
    return `${head}${propertyContents}${headClose}${children}${tail}`;
}

/* !
 * loupe
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */
const symbolsSupported = typeof Symbol === 'function' && typeof Symbol.for === 'function';
const chaiInspect = symbolsSupported ? Symbol.for('chai/inspect') : '@@chai/inspect';
let nodeInspect = false;
try {
    // eslint-disable-next-line global-require
    // @ts-ignore
    const nodeUtil = require('util');
    nodeInspect = nodeUtil.inspect ? nodeUtil.inspect.custom : false;
}
catch (noNodeInspect) {
    nodeInspect = false;
}
const constructorMap = new WeakMap();
const stringTagMap = {};
const baseTypesMap = {
    undefined: (value, options) => options.stylize('undefined', 'undefined'),
    null: (value, options) => options.stylize('null', 'null'),
    boolean: (value, options) => options.stylize(String(value), 'boolean'),
    Boolean: (value, options) => options.stylize(String(value), 'boolean'),
    number: inspectNumber,
    Number: inspectNumber,
    bigint: inspectBigInt,
    BigInt: inspectBigInt,
    string: inspectString,
    String: inspectString,
    function: inspectFunction,
    Function: inspectFunction,
    symbol: inspectSymbol,
    // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
    Symbol: inspectSymbol,
    Array: inspectArray,
    Date: inspectDate,
    Map: inspectMap,
    Set: inspectSet,
    RegExp: inspectRegExp,
    Promise: getPromiseValue,
    // WeakSet, WeakMap are totally opaque to us
    WeakSet: (value, options) => options.stylize('WeakSet{…}', 'special'),
    WeakMap: (value, options) => options.stylize('WeakMap{…}', 'special'),
    Arguments: inspectArguments,
    Int8Array: inspectTypedArray,
    Uint8Array: inspectTypedArray,
    Uint8ClampedArray: inspectTypedArray,
    Int16Array: inspectTypedArray,
    Uint16Array: inspectTypedArray,
    Int32Array: inspectTypedArray,
    Uint32Array: inspectTypedArray,
    Float32Array: inspectTypedArray,
    Float64Array: inspectTypedArray,
    Generator: () => '',
    DataView: () => '',
    ArrayBuffer: () => '',
    Error: inspectObject,
    HTMLCollection: inspectHTMLCollection,
    NodeList: inspectHTMLCollection,
};
// eslint-disable-next-line complexity
const inspectCustom = (value, options, type) => {
    if (chaiInspect in value && typeof value[chaiInspect] === 'function') {
        return value[chaiInspect](options);
    }
    if (nodeInspect && nodeInspect in value && typeof value[nodeInspect] === 'function') {
        return value[nodeInspect](options.depth, options);
    }
    if ('inspect' in value && typeof value.inspect === 'function') {
        return value.inspect(options.depth, options);
    }
    if ('constructor' in value && constructorMap.has(value.constructor)) {
        return constructorMap.get(value.constructor)(value, options);
    }
    if (stringTagMap[type]) {
        return stringTagMap[type](value, options);
    }
    return '';
};
const toString = Object.prototype.toString;
// eslint-disable-next-line complexity
function inspect$1(value, opts = {}) {
    const options = normaliseOptions(opts, inspect$1);
    const { customInspect } = options;
    let type = value === null ? 'null' : typeof value;
    if (type === 'object') {
        type = toString.call(value).slice(8, -1);
    }
    // If it is a base value that we already support, then use Loupe's inspector
    if (type in baseTypesMap) {
        return baseTypesMap[type](value, options);
    }
    // If `options.customInspect` is set to true then try to use the custom inspector
    if (customInspect && value) {
        const output = inspectCustom(value, options, type);
        if (output) {
            if (typeof output === 'string')
                return output;
            return inspect$1(output, options);
        }
    }
    const proto = value ? Object.getPrototypeOf(value) : false;
    // If it's a plain Object then use Loupe's inspector
    if (proto === Object.prototype || proto === null) {
        return inspectObject$1(value, options);
    }
    // Specifically account for HTMLElements
    // @ts-ignore
    if (value && typeof HTMLElement === 'function' && value instanceof HTMLElement) {
        return inspectHTML(value, options);
    }
    if ('constructor' in value) {
        // If it is a class, inspect it like an object but add the constructor name
        if (value.constructor !== Object) {
            return inspectClass(value, options);
        }
        // If it is an object with an anonymous prototype, display it as an object.
        return inspectObject$1(value, options);
    }
    // last chance to check if it's an object
    if (value === Object(value)) {
        return inspectObject$1(value, options);
    }
    // We have run out of options! Just stringify the value
    return options.stylize(String(value), type);
}

const {
  AsymmetricMatcher: AsymmetricMatcher$1,
  DOMCollection: DOMCollection$1,
  DOMElement: DOMElement$1,
  Immutable: Immutable$1,
  ReactElement: ReactElement$1,
  ReactTestComponent: ReactTestComponent$1
} = plugins;
const PLUGINS$1 = [
  ReactTestComponent$1,
  ReactElement$1,
  DOMElement$1,
  DOMCollection$1,
  Immutable$1,
  AsymmetricMatcher$1
];
function stringify(object, maxDepth = 10, { maxLength, ...options } = {}) {
  const MAX_LENGTH = maxLength ?? 1e4;
  let result;
  try {
    result = format$1(object, {
      maxDepth,
      escapeString: false,
      // min: true,
      plugins: PLUGINS$1,
      ...options
    });
  } catch {
    result = format$1(object, {
      callToJSON: false,
      maxDepth,
      escapeString: false,
      // min: true,
      plugins: PLUGINS$1,
      ...options
    });
  }
  return result.length >= MAX_LENGTH && maxDepth > 1 ? stringify(object, Math.floor(Math.min(maxDepth, Number.MAX_SAFE_INTEGER) / 2), { maxLength, ...options }) : result;
}
const formatRegExp = /%[sdjifoOc%]/g;
function format(...args) {
  if (typeof args[0] !== "string") {
    const objects = [];
    for (let i2 = 0; i2 < args.length; i2++) {
      objects.push(inspect(args[i2], { depth: 0, colors: false }));
    }
    return objects.join(" ");
  }
  const len = args.length;
  let i = 1;
  const template = args[0];
  let str = String(template).replace(formatRegExp, (x) => {
    if (x === "%%") {
      return "%";
    }
    if (i >= len) {
      return x;
    }
    switch (x) {
      case "%s": {
        const value = args[i++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        if (typeof value === "number" && value === 0 && 1 / value < 0) {
          return "-0";
        }
        if (typeof value === "object" && value !== null) {
          return inspect(value, { depth: 0, colors: false });
        }
        return String(value);
      }
      case "%d": {
        const value = args[i++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        return Number(value).toString();
      }
      case "%i": {
        const value = args[i++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        return Number.parseInt(String(value)).toString();
      }
      case "%f":
        return Number.parseFloat(String(args[i++])).toString();
      case "%o":
        return inspect(args[i++], { showHidden: true, showProxy: true });
      case "%O":
        return inspect(args[i++]);
      case "%c": {
        i++;
        return "";
      }
      case "%j":
        try {
          return JSON.stringify(args[i++]);
        } catch (err) {
          const m = err.message;
          if (
            // chromium
            m.includes("circular structure") || m.includes("cyclic structures") || m.includes("cyclic object")
          ) {
            return "[Circular]";
          }
          throw err;
        }
      default:
        return x;
    }
  });
  for (let x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== "object") {
      str += ` ${x}`;
    } else {
      str += ` ${inspect(x)}`;
    }
  }
  return str;
}
function inspect(obj, options = {}) {
  if (options.truncate === 0) {
    options.truncate = Number.POSITIVE_INFINITY;
  }
  return inspect$1(obj, options);
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}

function toArray(array) {
  if (array === null || array === void 0) {
    array = [];
  }
  if (Array.isArray(array)) {
    return array;
  }
  return [array];
}
function isFinalObj(obj) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype;
}
function getType$1(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function collectOwnProperties(obj, collector) {
  const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect);
  Object.getOwnPropertySymbols(obj).forEach(collect);
}
function getOwnProperties(obj) {
  const ownProps = /* @__PURE__ */ new Set();
  if (isFinalObj(obj)) {
    return [];
  }
  collectOwnProperties(obj, ownProps);
  return Array.from(ownProps);
}
const defaultCloneOptions = { forceWritable: false };
function deepClone(val, options = defaultCloneOptions) {
  const seen = /* @__PURE__ */ new WeakMap();
  return clone(val, seen, options);
}
function clone(val, seen, options = defaultCloneOptions) {
  let k, out;
  if (seen.has(val)) {
    return seen.get(val);
  }
  if (Array.isArray(val)) {
    out = Array.from({ length: k = val.length });
    seen.set(val, out);
    while (k--) {
      out[k] = clone(val[k], seen, options);
    }
    return out;
  }
  if (Object.prototype.toString.call(val) === "[object Object]") {
    out = Object.create(Object.getPrototypeOf(val));
    seen.set(val, out);
    const props = getOwnProperties(val);
    for (const k2 of props) {
      const descriptor = Object.getOwnPropertyDescriptor(val, k2);
      if (!descriptor) {
        continue;
      }
      const cloned = clone(val[k2], seen, options);
      if (options.forceWritable) {
        Object.defineProperty(out, k2, {
          enumerable: descriptor.enumerable,
          configurable: true,
          writable: true,
          value: cloned
        });
      } else if ("get" in descriptor) {
        Object.defineProperty(out, k2, {
          ...descriptor,
          get() {
            return cloned;
          }
        });
      } else {
        Object.defineProperty(out, k2, {
          ...descriptor,
          value: cloned
        });
      }
    }
    return out;
  }
  return val;
}

const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;
class Diff {
  0;
  1;
  constructor(op, text) {
    this[0] = op;
    this[1] = text;
  }
}
const diff_commonPrefix = function(text1, text2) {
  if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) {
    return 0;
  }
  let pointermin = 0;
  let pointermax = Math.min(text1.length, text2.length);
  let pointermid = pointermax;
  let pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};
const diff_commonSuffix = function(text1, text2) {
  if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) {
    return 0;
  }
  let pointermin = 0;
  let pointermax = Math.min(text1.length, text2.length);
  let pointermid = pointermax;
  let pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) === text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};
const diff_commonOverlap_ = function(text1, text2) {
  const text1_length = text1.length;
  const text2_length = text2.length;
  if (text1_length === 0 || text2_length === 0) {
    return 0;
  }
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  const text_length = Math.min(text1_length, text2_length);
  if (text1 === text2) {
    return text_length;
  }
  let best = 0;
  let length = 1;
  while (true) {
    const pattern = text1.substring(text_length - length);
    const found = text2.indexOf(pattern);
    if (found === -1) {
      return best;
    }
    length += found;
    if (found === 0 || text1.substring(text_length - length) === text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};
const diff_cleanupSemantic = function(diffs) {
  let changes = false;
  const equalities = [];
  let equalitiesLength = 0;
  let lastEquality = null;
  let pointer = 0;
  let length_insertions1 = 0;
  let length_deletions1 = 0;
  let length_insertions2 = 0;
  let length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_EQUAL) {
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastEquality = diffs[pointer][1];
    } else {
      if (diffs[pointer][0] === DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(length_insertions2, length_deletions2)) {
        diffs.splice(
          equalities[equalitiesLength - 1],
          0,
          new Diff(DIFF_DELETE, lastEquality)
        );
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastEquality = null;
        changes = true;
      }
    }
    pointer++;
  }
  if (changes) {
    diff_cleanupMerge(diffs);
  }
  diff_cleanupSemanticLossless(diffs);
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] === DIFF_DELETE && diffs[pointer][0] === DIFF_INSERT) {
      const deletion = diffs[pointer - 1][1];
      const insertion = diffs[pointer][1];
      const overlap_length1 = diff_commonOverlap_(deletion, insertion);
      const overlap_length2 = diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
          diffs.splice(
            pointer,
            0,
            new Diff(DIFF_EQUAL, insertion.substring(0, overlap_length1))
          );
          diffs[pointer - 1][1] = deletion.substring(
            0,
            deletion.length - overlap_length1
          );
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
          diffs.splice(
            pointer,
            0,
            new Diff(DIFF_EQUAL, deletion.substring(0, overlap_length2))
          );
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] = insertion.substring(
            0,
            insertion.length - overlap_length2
          );
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] = deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};
const nonAlphaNumericRegex_ = /[^a-z0-9]/i;
const whitespaceRegex_ = /\s/;
const linebreakRegex_ = /[\r\n]/;
const blanklineEndRegex_ = /\n\r?\n$/;
const blanklineStartRegex_ = /^\r?\n\r?\n/;
function diff_cleanupSemanticLossless(diffs) {
  let pointer = 1;
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
      let equality1 = diffs[pointer - 1][1];
      let edit = diffs[pointer][1];
      let equality2 = diffs[pointer + 1][1];
      const commonOffset = diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        const commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }
      let bestEquality1 = equality1;
      let bestEdit = edit;
      let bestEquality2 = equality2;
      let bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        const score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }
      if (diffs[pointer - 1][1] !== bestEquality1) {
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
}
function diff_cleanupMerge(diffs) {
  diffs.push(new Diff(DIFF_EQUAL, ""));
  let pointer = 0;
  let count_delete = 0;
  let count_insert = 0;
  let text_delete = "";
  let text_insert = "";
  let commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            commonlength = diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] === DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
              } else {
                diffs.splice(
                  0,
                  0,
                  new Diff(DIFF_EQUAL, text_insert.substring(0, commonlength))
                );
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            commonlength = diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(
                0,
                text_insert.length - commonlength
              );
              text_delete = text_delete.substring(
                0,
                text_delete.length - commonlength
              );
            }
          }
          pointer -= count_delete + count_insert;
          diffs.splice(pointer, count_delete + count_insert);
          if (text_delete.length) {
            diffs.splice(pointer, 0, new Diff(DIFF_DELETE, text_delete));
            pointer++;
          }
          if (text_insert.length) {
            diffs.splice(pointer, 0, new Diff(DIFF_INSERT, text_insert));
            pointer++;
          }
          pointer++;
        } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = "";
        text_insert = "";
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === "") {
    diffs.pop();
  }
  let changes = false;
  pointer = 1;
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
      if (diffs[pointer][1].substring(
        diffs[pointer][1].length - diffs[pointer - 1][1].length
      ) === diffs[pointer - 1][1]) {
        diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(
          0,
          diffs[pointer][1].length - diffs[pointer - 1][1].length
        );
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1]) {
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  if (changes) {
    diff_cleanupMerge(diffs);
  }
}
function diff_cleanupSemanticScore_(one, two) {
  if (!one || !two) {
    return 6;
  }
  const char1 = one.charAt(one.length - 1);
  const char2 = two.charAt(0);
  const nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_);
  const nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_);
  const whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_);
  const whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_);
  const lineBreak1 = whitespace1 && char1.match(linebreakRegex_);
  const lineBreak2 = whitespace2 && char2.match(linebreakRegex_);
  const blankLine1 = lineBreak1 && one.match(blanklineEndRegex_);
  const blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
  if (blankLine1 || blankLine2) {
    return 5;
  } else if (lineBreak1 || lineBreak2) {
    return 4;
  } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
    return 3;
  } else if (whitespace1 || whitespace2) {
    return 2;
  } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
    return 1;
  }
  return 0;
}
const NO_DIFF_MESSAGE = "Compared values have no visual difference.";
const SIMILAR_MESSAGE = "Compared values serialize to the same structure.\nPrinting internal object structure without calling `toJSON` instead.";
var build = {};
var hasRequiredBuild;
function requireBuild() {
  if (hasRequiredBuild) return build;
  hasRequiredBuild = 1;
  Object.defineProperty(build, "__esModule", {
    value: true
  });
  build.default = diffSequence;
  const pkg = "diff-sequences";
  const NOT_YET_SET = 0;
  const countCommonItemsF = (aIndex, aEnd, bIndex, bEnd, isCommon) => {
    let nCommon = 0;
    while (aIndex < aEnd && bIndex < bEnd && isCommon(aIndex, bIndex)) {
      aIndex += 1;
      bIndex += 1;
      nCommon += 1;
    }
    return nCommon;
  };
  const countCommonItemsR = (aStart, aIndex, bStart, bIndex, isCommon) => {
    let nCommon = 0;
    while (aStart <= aIndex && bStart <= bIndex && isCommon(aIndex, bIndex)) {
      aIndex -= 1;
      bIndex -= 1;
      nCommon += 1;
    }
    return nCommon;
  };
  const extendPathsF = (d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF) => {
    let iF = 0;
    let kF = -d;
    let aFirst = aIndexesF[iF];
    let aIndexPrev1 = aFirst;
    aIndexesF[iF] += countCommonItemsF(
      aFirst + 1,
      aEnd,
      bF + aFirst - kF + 1,
      bEnd,
      isCommon
    );
    const nF = d < iMaxF ? d : iMaxF;
    for (iF += 1, kF += 2; iF <= nF; iF += 1, kF += 2) {
      if (iF !== d && aIndexPrev1 < aIndexesF[iF]) {
        aFirst = aIndexesF[iF];
      } else {
        aFirst = aIndexPrev1 + 1;
        if (aEnd <= aFirst) {
          return iF - 1;
        }
      }
      aIndexPrev1 = aIndexesF[iF];
      aIndexesF[iF] = aFirst + countCommonItemsF(aFirst + 1, aEnd, bF + aFirst - kF + 1, bEnd, isCommon);
    }
    return iMaxF;
  };
  const extendPathsR = (d, aStart, bStart, bR, isCommon, aIndexesR, iMaxR) => {
    let iR = 0;
    let kR = d;
    let aFirst = aIndexesR[iR];
    let aIndexPrev1 = aFirst;
    aIndexesR[iR] -= countCommonItemsR(
      aStart,
      aFirst - 1,
      bStart,
      bR + aFirst - kR - 1,
      isCommon
    );
    const nR = d < iMaxR ? d : iMaxR;
    for (iR += 1, kR -= 2; iR <= nR; iR += 1, kR -= 2) {
      if (iR !== d && aIndexesR[iR] < aIndexPrev1) {
        aFirst = aIndexesR[iR];
      } else {
        aFirst = aIndexPrev1 - 1;
        if (aFirst < aStart) {
          return iR - 1;
        }
      }
      aIndexPrev1 = aIndexesR[iR];
      aIndexesR[iR] = aFirst - countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bR + aFirst - kR - 1,
        isCommon
      );
    }
    return iMaxR;
  };
  const extendOverlappablePathsF = (d, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    const bF = bStart - aStart;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    const kMinOverlapF = -baDeltaLength - (d - 1);
    const kMaxOverlapF = -baDeltaLength + (d - 1);
    let aIndexPrev1 = NOT_YET_SET;
    const nF = d < iMaxF ? d : iMaxF;
    for (let iF = 0, kF = -d; iF <= nF; iF += 1, kF += 2) {
      const insert = iF === 0 || iF !== d && aIndexPrev1 < aIndexesF[iF];
      const aLastPrev = insert ? aIndexesF[iF] : aIndexPrev1;
      const aFirst = insert ? aLastPrev : aLastPrev + 1;
      const bFirst = bF + aFirst - kF;
      const nCommonF = countCommonItemsF(
        aFirst + 1,
        aEnd,
        bFirst + 1,
        bEnd,
        isCommon
      );
      const aLast = aFirst + nCommonF;
      aIndexPrev1 = aIndexesF[iF];
      aIndexesF[iF] = aLast;
      if (kMinOverlapF <= kF && kF <= kMaxOverlapF) {
        const iR = (d - 1 - (kF + baDeltaLength)) / 2;
        if (iR <= iMaxR && aIndexesR[iR] - 1 <= aLast) {
          const bLastPrev = bF + aLastPrev - (insert ? kF + 1 : kF - 1);
          const nCommonR = countCommonItemsR(
            aStart,
            aLastPrev,
            bStart,
            bLastPrev,
            isCommon
          );
          const aIndexPrevFirst = aLastPrev - nCommonR;
          const bIndexPrevFirst = bLastPrev - nCommonR;
          const aEndPreceding = aIndexPrevFirst + 1;
          const bEndPreceding = bIndexPrevFirst + 1;
          division.nChangePreceding = d - 1;
          if (d - 1 === aEndPreceding + bEndPreceding - aStart - bStart) {
            division.aEndPreceding = aStart;
            division.bEndPreceding = bStart;
          } else {
            division.aEndPreceding = aEndPreceding;
            division.bEndPreceding = bEndPreceding;
          }
          division.nCommonPreceding = nCommonR;
          if (nCommonR !== 0) {
            division.aCommonPreceding = aEndPreceding;
            division.bCommonPreceding = bEndPreceding;
          }
          division.nCommonFollowing = nCommonF;
          if (nCommonF !== 0) {
            division.aCommonFollowing = aFirst + 1;
            division.bCommonFollowing = bFirst + 1;
          }
          const aStartFollowing = aLast + 1;
          const bStartFollowing = bFirst + nCommonF + 1;
          division.nChangeFollowing = d - 1;
          if (d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
            division.aStartFollowing = aEnd;
            division.bStartFollowing = bEnd;
          } else {
            division.aStartFollowing = aStartFollowing;
            division.bStartFollowing = bStartFollowing;
          }
          return true;
        }
      }
    }
    return false;
  };
  const extendOverlappablePathsR = (d, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    const bR = bEnd - aEnd;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    const kMinOverlapR = baDeltaLength - d;
    const kMaxOverlapR = baDeltaLength + d;
    let aIndexPrev1 = NOT_YET_SET;
    const nR = d < iMaxR ? d : iMaxR;
    for (let iR = 0, kR = d; iR <= nR; iR += 1, kR -= 2) {
      const insert = iR === 0 || iR !== d && aIndexesR[iR] < aIndexPrev1;
      const aLastPrev = insert ? aIndexesR[iR] : aIndexPrev1;
      const aFirst = insert ? aLastPrev : aLastPrev - 1;
      const bFirst = bR + aFirst - kR;
      const nCommonR = countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bFirst - 1,
        isCommon
      );
      const aLast = aFirst - nCommonR;
      aIndexPrev1 = aIndexesR[iR];
      aIndexesR[iR] = aLast;
      if (kMinOverlapR <= kR && kR <= kMaxOverlapR) {
        const iF = (d + (kR - baDeltaLength)) / 2;
        if (iF <= iMaxF && aLast - 1 <= aIndexesF[iF]) {
          const bLast = bFirst - nCommonR;
          division.nChangePreceding = d;
          if (d === aLast + bLast - aStart - bStart) {
            division.aEndPreceding = aStart;
            division.bEndPreceding = bStart;
          } else {
            division.aEndPreceding = aLast;
            division.bEndPreceding = bLast;
          }
          division.nCommonPreceding = nCommonR;
          if (nCommonR !== 0) {
            division.aCommonPreceding = aLast;
            division.bCommonPreceding = bLast;
          }
          division.nChangeFollowing = d - 1;
          if (d === 1) {
            division.nCommonFollowing = 0;
            division.aStartFollowing = aEnd;
            division.bStartFollowing = bEnd;
          } else {
            const bLastPrev = bR + aLastPrev - (insert ? kR - 1 : kR + 1);
            const nCommonF = countCommonItemsF(
              aLastPrev,
              aEnd,
              bLastPrev,
              bEnd,
              isCommon
            );
            division.nCommonFollowing = nCommonF;
            if (nCommonF !== 0) {
              division.aCommonFollowing = aLastPrev;
              division.bCommonFollowing = bLastPrev;
            }
            const aStartFollowing = aLastPrev + nCommonF;
            const bStartFollowing = bLastPrev + nCommonF;
            if (d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
              division.aStartFollowing = aEnd;
              division.bStartFollowing = bEnd;
            } else {
              division.aStartFollowing = aStartFollowing;
              division.bStartFollowing = bStartFollowing;
            }
          }
          return true;
        }
      }
    }
    return false;
  };
  const divide = (nChange, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, aIndexesR, division) => {
    const bF = bStart - aStart;
    const bR = bEnd - aEnd;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    let iMaxF = aLength;
    let iMaxR = aLength;
    aIndexesF[0] = aStart - 1;
    aIndexesR[0] = aEnd;
    if (baDeltaLength % 2 === 0) {
      const dMin = (nChange || baDeltaLength) / 2;
      const dMax = (aLength + bLength) / 2;
      for (let d = 1; d <= dMax; d += 1) {
        iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
        if (d < dMin) {
          iMaxR = extendPathsR(d, aStart, bStart, bR, isCommon, aIndexesR, iMaxR);
        } else if (
          // If a reverse path overlaps a forward path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsR(
            d,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        ) {
          return;
        }
      }
    } else {
      const dMin = ((nChange || baDeltaLength) + 1) / 2;
      const dMax = (aLength + bLength + 1) / 2;
      let d = 1;
      iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
      for (d += 1; d <= dMax; d += 1) {
        iMaxR = extendPathsR(
          d - 1,
          aStart,
          bStart,
          bR,
          isCommon,
          aIndexesR,
          iMaxR
        );
        if (d < dMin) {
          iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
        } else if (
          // If a forward path overlaps a reverse path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsF(
            d,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        ) {
          return;
        }
      }
    }
    throw new Error(
      `${pkg}: no overlap aStart=${aStart} aEnd=${aEnd} bStart=${bStart} bEnd=${bEnd}`
    );
  };
  const findSubsequences = (nChange, aStart, aEnd, bStart, bEnd, transposed, callbacks, aIndexesF, aIndexesR, division) => {
    if (bEnd - bStart < aEnd - aStart) {
      transposed = !transposed;
      if (transposed && callbacks.length === 1) {
        const { foundSubsequence: foundSubsequence2, isCommon: isCommon2 } = callbacks[0];
        callbacks[1] = {
          foundSubsequence: (nCommon, bCommon, aCommon) => {
            foundSubsequence2(nCommon, aCommon, bCommon);
          },
          isCommon: (bIndex, aIndex) => isCommon2(aIndex, bIndex)
        };
      }
      const tStart = aStart;
      const tEnd = aEnd;
      aStart = bStart;
      aEnd = bEnd;
      bStart = tStart;
      bEnd = tEnd;
    }
    const { foundSubsequence, isCommon } = callbacks[transposed ? 1 : 0];
    divide(
      nChange,
      aStart,
      aEnd,
      bStart,
      bEnd,
      isCommon,
      aIndexesF,
      aIndexesR,
      division
    );
    const {
      nChangePreceding,
      aEndPreceding,
      bEndPreceding,
      nCommonPreceding,
      aCommonPreceding,
      bCommonPreceding,
      nCommonFollowing,
      aCommonFollowing,
      bCommonFollowing,
      nChangeFollowing,
      aStartFollowing,
      bStartFollowing
    } = division;
    if (aStart < aEndPreceding && bStart < bEndPreceding) {
      findSubsequences(
        nChangePreceding,
        aStart,
        aEndPreceding,
        bStart,
        bEndPreceding,
        transposed,
        callbacks,
        aIndexesF,
        aIndexesR,
        division
      );
    }
    if (nCommonPreceding !== 0) {
      foundSubsequence(nCommonPreceding, aCommonPreceding, bCommonPreceding);
    }
    if (nCommonFollowing !== 0) {
      foundSubsequence(nCommonFollowing, aCommonFollowing, bCommonFollowing);
    }
    if (aStartFollowing < aEnd && bStartFollowing < bEnd) {
      findSubsequences(
        nChangeFollowing,
        aStartFollowing,
        aEnd,
        bStartFollowing,
        bEnd,
        transposed,
        callbacks,
        aIndexesF,
        aIndexesR,
        division
      );
    }
  };
  const validateLength = (name, arg) => {
    if (typeof arg !== "number") {
      throw new TypeError(`${pkg}: ${name} typeof ${typeof arg} is not a number`);
    }
    if (!Number.isSafeInteger(arg)) {
      throw new RangeError(`${pkg}: ${name} value ${arg} is not a safe integer`);
    }
    if (arg < 0) {
      throw new RangeError(`${pkg}: ${name} value ${arg} is a negative integer`);
    }
  };
  const validateCallback = (name, arg) => {
    const type = typeof arg;
    if (type !== "function") {
      throw new TypeError(`${pkg}: ${name} typeof ${type} is not a function`);
    }
  };
  function diffSequence(aLength, bLength, isCommon, foundSubsequence) {
    validateLength("aLength", aLength);
    validateLength("bLength", bLength);
    validateCallback("isCommon", isCommon);
    validateCallback("foundSubsequence", foundSubsequence);
    const nCommonF = countCommonItemsF(0, aLength, 0, bLength, isCommon);
    if (nCommonF !== 0) {
      foundSubsequence(nCommonF, 0, 0);
    }
    if (aLength !== nCommonF || bLength !== nCommonF) {
      const aStart = nCommonF;
      const bStart = nCommonF;
      const nCommonR = countCommonItemsR(
        aStart,
        aLength - 1,
        bStart,
        bLength - 1,
        isCommon
      );
      const aEnd = aLength - nCommonR;
      const bEnd = bLength - nCommonR;
      const nCommonFR = nCommonF + nCommonR;
      if (aLength !== nCommonFR && bLength !== nCommonFR) {
        const nChange = 0;
        const transposed = false;
        const callbacks = [
          {
            foundSubsequence,
            isCommon
          }
        ];
        const aIndexesF = [NOT_YET_SET];
        const aIndexesR = [NOT_YET_SET];
        const division = {
          aCommonFollowing: NOT_YET_SET,
          aCommonPreceding: NOT_YET_SET,
          aEndPreceding: NOT_YET_SET,
          aStartFollowing: NOT_YET_SET,
          bCommonFollowing: NOT_YET_SET,
          bCommonPreceding: NOT_YET_SET,
          bEndPreceding: NOT_YET_SET,
          bStartFollowing: NOT_YET_SET,
          nChangeFollowing: NOT_YET_SET,
          nChangePreceding: NOT_YET_SET,
          nCommonFollowing: NOT_YET_SET,
          nCommonPreceding: NOT_YET_SET
        };
        findSubsequences(
          nChange,
          aStart,
          aEnd,
          bStart,
          bEnd,
          transposed,
          callbacks,
          aIndexesF,
          aIndexesR,
          division
        );
      }
      if (nCommonR !== 0) {
        foundSubsequence(nCommonR, aEnd, bEnd);
      }
    }
  }
  return build;
}
var buildExports = requireBuild();
var diffSequences = /* @__PURE__ */ getDefaultExportFromCjs(buildExports);
function formatTrailingSpaces(line, trailingSpaceFormatter) {
  return line.replace(/\s+$/, (match) => trailingSpaceFormatter(match));
}
function printDiffLine(line, isFirstOrLast, color, indicator, trailingSpaceFormatter, emptyFirstOrLastLinePlaceholder) {
  return line.length !== 0 ? color(
    `${indicator} ${formatTrailingSpaces(line, trailingSpaceFormatter)}`
  ) : indicator !== " " ? color(indicator) : isFirstOrLast && emptyFirstOrLastLinePlaceholder.length !== 0 ? color(`${indicator} ${emptyFirstOrLastLinePlaceholder}`) : "";
}
function printDeleteLine(line, isFirstOrLast, {
  aColor,
  aIndicator,
  changeLineTrailingSpaceColor,
  emptyFirstOrLastLinePlaceholder
}) {
  return printDiffLine(
    line,
    isFirstOrLast,
    aColor,
    aIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );
}
function printInsertLine(line, isFirstOrLast, {
  bColor,
  bIndicator,
  changeLineTrailingSpaceColor,
  emptyFirstOrLastLinePlaceholder
}) {
  return printDiffLine(
    line,
    isFirstOrLast,
    bColor,
    bIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );
}
function printCommonLine(line, isFirstOrLast, {
  commonColor,
  commonIndicator,
  commonLineTrailingSpaceColor,
  emptyFirstOrLastLinePlaceholder
}) {
  return printDiffLine(
    line,
    isFirstOrLast,
    commonColor,
    commonIndicator,
    commonLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );
}
function createPatchMark(aStart, aEnd, bStart, bEnd, { patchColor }) {
  return patchColor(
    `@@ -${aStart + 1},${aEnd - aStart} +${bStart + 1},${bEnd - bStart} @@`
  );
}
function joinAlignedDiffsNoExpand(diffs, options) {
  const iLength = diffs.length;
  const nContextLines = options.contextLines;
  const nContextLines2 = nContextLines + nContextLines;
  let jLength = iLength;
  let hasExcessAtStartOrEnd = false;
  let nExcessesBetweenChanges = 0;
  let i = 0;
  while (i !== iLength) {
    const iStart = i;
    while (i !== iLength && diffs[i][0] === DIFF_EQUAL) {
      i += 1;
    }
    if (iStart !== i) {
      if (iStart === 0) {
        if (i > nContextLines) {
          jLength -= i - nContextLines;
          hasExcessAtStartOrEnd = true;
        }
      } else if (i === iLength) {
        const n = i - iStart;
        if (n > nContextLines) {
          jLength -= n - nContextLines;
          hasExcessAtStartOrEnd = true;
        }
      } else {
        const n = i - iStart;
        if (n > nContextLines2) {
          jLength -= n - nContextLines2;
          nExcessesBetweenChanges += 1;
        }
      }
    }
    while (i !== iLength && diffs[i][0] !== DIFF_EQUAL) {
      i += 1;
    }
  }
  const hasPatch = nExcessesBetweenChanges !== 0 || hasExcessAtStartOrEnd;
  if (nExcessesBetweenChanges !== 0) {
    jLength += nExcessesBetweenChanges + 1;
  } else if (hasExcessAtStartOrEnd) {
    jLength += 1;
  }
  const jLast = jLength - 1;
  const lines = [];
  let jPatchMark = 0;
  if (hasPatch) {
    lines.push("");
  }
  let aStart = 0;
  let bStart = 0;
  let aEnd = 0;
  let bEnd = 0;
  const pushCommonLine = (line) => {
    const j = lines.length;
    lines.push(printCommonLine(line, j === 0 || j === jLast, options));
    aEnd += 1;
    bEnd += 1;
  };
  const pushDeleteLine = (line) => {
    const j = lines.length;
    lines.push(printDeleteLine(line, j === 0 || j === jLast, options));
    aEnd += 1;
  };
  const pushInsertLine = (line) => {
    const j = lines.length;
    lines.push(printInsertLine(line, j === 0 || j === jLast, options));
    bEnd += 1;
  };
  i = 0;
  while (i !== iLength) {
    let iStart = i;
    while (i !== iLength && diffs[i][0] === DIFF_EQUAL) {
      i += 1;
    }
    if (iStart !== i) {
      if (iStart === 0) {
        if (i > nContextLines) {
          iStart = i - nContextLines;
          aStart = iStart;
          bStart = iStart;
          aEnd = aStart;
          bEnd = bStart;
        }
        for (let iCommon = iStart; iCommon !== i; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else if (i === iLength) {
        const iEnd = i - iStart > nContextLines ? iStart + nContextLines : i;
        for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else {
        const nCommon = i - iStart;
        if (nCommon > nContextLines2) {
          const iEnd = iStart + nContextLines;
          for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
          lines[jPatchMark] = createPatchMark(
            aStart,
            aEnd,
            bStart,
            bEnd,
            options
          );
          jPatchMark = lines.length;
          lines.push("");
          const nOmit = nCommon - nContextLines2;
          aStart = aEnd + nOmit;
          bStart = bEnd + nOmit;
          aEnd = aStart;
          bEnd = bStart;
          for (let iCommon = i - nContextLines; iCommon !== i; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        } else {
          for (let iCommon = iStart; iCommon !== i; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        }
      }
    }
    while (i !== iLength && diffs[i][0] === DIFF_DELETE) {
      pushDeleteLine(diffs[i][1]);
      i += 1;
    }
    while (i !== iLength && diffs[i][0] === DIFF_INSERT) {
      pushInsertLine(diffs[i][1]);
      i += 1;
    }
  }
  if (hasPatch) {
    lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options);
  }
  return lines.join("\n");
}
function joinAlignedDiffsExpand(diffs, options) {
  return diffs.map((diff2, i, diffs2) => {
    const line = diff2[1];
    const isFirstOrLast = i === 0 || i === diffs2.length - 1;
    switch (diff2[0]) {
      case DIFF_DELETE:
        return printDeleteLine(line, isFirstOrLast, options);
      case DIFF_INSERT:
        return printInsertLine(line, isFirstOrLast, options);
      default:
        return printCommonLine(line, isFirstOrLast, options);
    }
  }).join("\n");
}
const noColor = (string) => string;
const DIFF_CONTEXT_DEFAULT = 5;
const DIFF_TRUNCATE_THRESHOLD_DEFAULT = 0;
function getDefaultOptions() {
  return {
    aAnnotation: "Expected",
    aColor: s.green,
    aIndicator: "-",
    bAnnotation: "Received",
    bColor: s.red,
    bIndicator: "+",
    changeColor: s.inverse,
    changeLineTrailingSpaceColor: noColor,
    commonColor: s.dim,
    commonIndicator: " ",
    commonLineTrailingSpaceColor: noColor,
    compareKeys: void 0,
    contextLines: DIFF_CONTEXT_DEFAULT,
    emptyFirstOrLastLinePlaceholder: "",
    expand: true,
    includeChangeCounts: false,
    omitAnnotationLines: false,
    patchColor: s.yellow,
    printBasicPrototype: false,
    truncateThreshold: DIFF_TRUNCATE_THRESHOLD_DEFAULT,
    truncateAnnotation: "... Diff result is truncated",
    truncateAnnotationColor: noColor
  };
}
function getCompareKeys(compareKeys) {
  return compareKeys && typeof compareKeys === "function" ? compareKeys : void 0;
}
function getContextLines(contextLines) {
  return typeof contextLines === "number" && Number.isSafeInteger(contextLines) && contextLines >= 0 ? contextLines : DIFF_CONTEXT_DEFAULT;
}
function normalizeDiffOptions(options = {}) {
  return {
    ...getDefaultOptions(),
    ...options,
    compareKeys: getCompareKeys(options.compareKeys),
    contextLines: getContextLines(options.contextLines)
  };
}
function isEmptyString(lines) {
  return lines.length === 1 && lines[0].length === 0;
}
function countChanges(diffs) {
  let a = 0;
  let b = 0;
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        a += 1;
        break;
      case DIFF_INSERT:
        b += 1;
        break;
    }
  });
  return { a, b };
}
function printAnnotation({
  aAnnotation,
  aColor,
  aIndicator,
  bAnnotation,
  bColor,
  bIndicator,
  includeChangeCounts,
  omitAnnotationLines
}, changeCounts) {
  if (omitAnnotationLines) {
    return "";
  }
  let aRest = "";
  let bRest = "";
  if (includeChangeCounts) {
    const aCount = String(changeCounts.a);
    const bCount = String(changeCounts.b);
    const baAnnotationLengthDiff = bAnnotation.length - aAnnotation.length;
    const aAnnotationPadding = " ".repeat(Math.max(0, baAnnotationLengthDiff));
    const bAnnotationPadding = " ".repeat(Math.max(0, -baAnnotationLengthDiff));
    const baCountLengthDiff = bCount.length - aCount.length;
    const aCountPadding = " ".repeat(Math.max(0, baCountLengthDiff));
    const bCountPadding = " ".repeat(Math.max(0, -baCountLengthDiff));
    aRest = `${aAnnotationPadding}  ${aIndicator} ${aCountPadding}${aCount}`;
    bRest = `${bAnnotationPadding}  ${bIndicator} ${bCountPadding}${bCount}`;
  }
  const a = `${aIndicator} ${aAnnotation}${aRest}`;
  const b = `${bIndicator} ${bAnnotation}${bRest}`;
  return `${aColor(a)}
${bColor(b)}

`;
}
function printDiffLines(diffs, truncated, options) {
  return printAnnotation(options, countChanges(diffs)) + (options.expand ? joinAlignedDiffsExpand(diffs, options) : joinAlignedDiffsNoExpand(diffs, options)) + (truncated ? options.truncateAnnotationColor(`
${options.truncateAnnotation}`) : "");
}
function diffLinesUnified(aLines, bLines, options) {
  const normalizedOptions = normalizeDiffOptions(options);
  const [diffs, truncated] = diffLinesRaw(
    isEmptyString(aLines) ? [] : aLines,
    isEmptyString(bLines) ? [] : bLines,
    normalizedOptions
  );
  return printDiffLines(diffs, truncated, normalizedOptions);
}
function diffLinesUnified2(aLinesDisplay, bLinesDisplay, aLinesCompare, bLinesCompare, options) {
  if (isEmptyString(aLinesDisplay) && isEmptyString(aLinesCompare)) {
    aLinesDisplay = [];
    aLinesCompare = [];
  }
  if (isEmptyString(bLinesDisplay) && isEmptyString(bLinesCompare)) {
    bLinesDisplay = [];
    bLinesCompare = [];
  }
  if (aLinesDisplay.length !== aLinesCompare.length || bLinesDisplay.length !== bLinesCompare.length) {
    return diffLinesUnified(aLinesDisplay, bLinesDisplay, options);
  }
  const [diffs, truncated] = diffLinesRaw(
    aLinesCompare,
    bLinesCompare,
    options
  );
  let aIndex = 0;
  let bIndex = 0;
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        diff2[1] = aLinesDisplay[aIndex];
        aIndex += 1;
        break;
      case DIFF_INSERT:
        diff2[1] = bLinesDisplay[bIndex];
        bIndex += 1;
        break;
      default:
        diff2[1] = bLinesDisplay[bIndex];
        aIndex += 1;
        bIndex += 1;
    }
  });
  return printDiffLines(diffs, truncated, normalizeDiffOptions(options));
}
function diffLinesRaw(aLines, bLines, options) {
  const truncate = (options == null ? void 0 : options.truncateThreshold) ?? false;
  const truncateThreshold = Math.max(
    Math.floor((options == null ? void 0 : options.truncateThreshold) ?? 0),
    0
  );
  const aLength = truncate ? Math.min(aLines.length, truncateThreshold) : aLines.length;
  const bLength = truncate ? Math.min(bLines.length, truncateThreshold) : bLines.length;
  const truncated = aLength !== aLines.length || bLength !== bLines.length;
  const isCommon = (aIndex2, bIndex2) => aLines[aIndex2] === bLines[bIndex2];
  const diffs = [];
  let aIndex = 0;
  let bIndex = 0;
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      diffs.push(new Diff(DIFF_EQUAL, bLines[bIndex]));
    }
  };
  diffSequences(aLength, bLength, isCommon, foundSubsequence);
  for (; aIndex !== aLength; aIndex += 1) {
    diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
  }
  for (; bIndex !== bLength; bIndex += 1) {
    diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
  }
  return [diffs, truncated];
}
function getType(value) {
  if (value === void 0) {
    return "undefined";
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  } else if (typeof value === "boolean") {
    return "boolean";
  } else if (typeof value === "function") {
    return "function";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "string") {
    return "string";
  } else if (typeof value === "bigint") {
    return "bigint";
  } else if (typeof value === "object") {
    if (value != null) {
      if (value.constructor === RegExp) {
        return "regexp";
      } else if (value.constructor === Map) {
        return "map";
      } else if (value.constructor === Set) {
        return "set";
      } else if (value.constructor === Date) {
        return "date";
      }
    }
    return "object";
  } else if (typeof value === "symbol") {
    return "symbol";
  }
  throw new Error(`value of unknown type: ${value}`);
}
function getNewLineSymbol(string) {
  return string.includes("\r\n") ? "\r\n" : "\n";
}
function diffStrings(a, b, options) {
  const truncate = (options == null ? void 0 : options.truncateThreshold) ?? false;
  const truncateThreshold = Math.max(
    Math.floor((options == null ? void 0 : options.truncateThreshold) ?? 0),
    0
  );
  let aLength = a.length;
  let bLength = b.length;
  if (truncate) {
    const aMultipleLines = a.includes("\n");
    const bMultipleLines = b.includes("\n");
    const aNewLineSymbol = getNewLineSymbol(a);
    const bNewLineSymbol = getNewLineSymbol(b);
    const _a = aMultipleLines ? `${a.split(aNewLineSymbol, truncateThreshold).join(aNewLineSymbol)}
` : a;
    const _b = bMultipleLines ? `${b.split(bNewLineSymbol, truncateThreshold).join(bNewLineSymbol)}
` : b;
    aLength = _a.length;
    bLength = _b.length;
  }
  const truncated = aLength !== a.length || bLength !== b.length;
  const isCommon = (aIndex2, bIndex2) => a[aIndex2] === b[bIndex2];
  let aIndex = 0;
  let bIndex = 0;
  const diffs = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    if (aIndex !== aCommon) {
      diffs.push(new Diff(DIFF_DELETE, a.slice(aIndex, aCommon)));
    }
    if (bIndex !== bCommon) {
      diffs.push(new Diff(DIFF_INSERT, b.slice(bIndex, bCommon)));
    }
    aIndex = aCommon + nCommon;
    bIndex = bCommon + nCommon;
    diffs.push(new Diff(DIFF_EQUAL, b.slice(bCommon, bIndex)));
  };
  diffSequences(aLength, bLength, isCommon, foundSubsequence);
  if (aIndex !== aLength) {
    diffs.push(new Diff(DIFF_DELETE, a.slice(aIndex)));
  }
  if (bIndex !== bLength) {
    diffs.push(new Diff(DIFF_INSERT, b.slice(bIndex)));
  }
  return [diffs, truncated];
}
function concatenateRelevantDiffs(op, diffs, changeColor) {
  return diffs.reduce(
    (reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op && diff2[1].length !== 0 ? changeColor(diff2[1]) : ""),
    ""
  );
}
class ChangeBuffer {
  op;
  line;
  // incomplete line
  lines;
  // complete lines
  changeColor;
  constructor(op, changeColor) {
    this.op = op;
    this.line = [];
    this.lines = [];
    this.changeColor = changeColor;
  }
  pushSubstring(substring) {
    this.pushDiff(new Diff(this.op, substring));
  }
  pushLine() {
    this.lines.push(
      this.line.length !== 1 ? new Diff(
        this.op,
        concatenateRelevantDiffs(this.op, this.line, this.changeColor)
      ) : this.line[0][0] === this.op ? this.line[0] : new Diff(this.op, this.line[0][1])
      // was common diff
    );
    this.line.length = 0;
  }
  isLineEmpty() {
    return this.line.length === 0;
  }
  // Minor input to buffer.
  pushDiff(diff2) {
    this.line.push(diff2);
  }
  // Main input to buffer.
  align(diff2) {
    const string = diff2[1];
    if (string.includes("\n")) {
      const substrings = string.split("\n");
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        if (i < iLast) {
          this.pushSubstring(substring);
          this.pushLine();
        } else if (substring.length !== 0) {
          this.pushSubstring(substring);
        }
      });
    } else {
      this.pushDiff(diff2);
    }
  }
  // Output from buffer.
  moveLinesTo(lines) {
    if (!this.isLineEmpty()) {
      this.pushLine();
    }
    lines.push(...this.lines);
    this.lines.length = 0;
  }
}
class CommonBuffer {
  deleteBuffer;
  insertBuffer;
  lines;
  constructor(deleteBuffer, insertBuffer) {
    this.deleteBuffer = deleteBuffer;
    this.insertBuffer = insertBuffer;
    this.lines = [];
  }
  pushDiffCommonLine(diff2) {
    this.lines.push(diff2);
  }
  pushDiffChangeLines(diff2) {
    const isDiffEmpty = diff2[1].length === 0;
    if (!isDiffEmpty || this.deleteBuffer.isLineEmpty()) {
      this.deleteBuffer.pushDiff(diff2);
    }
    if (!isDiffEmpty || this.insertBuffer.isLineEmpty()) {
      this.insertBuffer.pushDiff(diff2);
    }
  }
  flushChangeLines() {
    this.deleteBuffer.moveLinesTo(this.lines);
    this.insertBuffer.moveLinesTo(this.lines);
  }
  // Input to buffer.
  align(diff2) {
    const op = diff2[0];
    const string = diff2[1];
    if (string.includes("\n")) {
      const substrings = string.split("\n");
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        if (i === 0) {
          const subdiff = new Diff(op, substring);
          if (this.deleteBuffer.isLineEmpty() && this.insertBuffer.isLineEmpty()) {
            this.flushChangeLines();
            this.pushDiffCommonLine(subdiff);
          } else {
            this.pushDiffChangeLines(subdiff);
            this.flushChangeLines();
          }
        } else if (i < iLast) {
          this.pushDiffCommonLine(new Diff(op, substring));
        } else if (substring.length !== 0) {
          this.pushDiffChangeLines(new Diff(op, substring));
        }
      });
    } else {
      this.pushDiffChangeLines(diff2);
    }
  }
  // Output from buffer.
  getLines() {
    this.flushChangeLines();
    return this.lines;
  }
}
function getAlignedDiffs(diffs, changeColor) {
  const deleteBuffer = new ChangeBuffer(DIFF_DELETE, changeColor);
  const insertBuffer = new ChangeBuffer(DIFF_INSERT, changeColor);
  const commonBuffer = new CommonBuffer(deleteBuffer, insertBuffer);
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        deleteBuffer.align(diff2);
        break;
      case DIFF_INSERT:
        insertBuffer.align(diff2);
        break;
      default:
        commonBuffer.align(diff2);
    }
  });
  return commonBuffer.getLines();
}
function hasCommonDiff(diffs, isMultiline) {
  if (isMultiline) {
    const iLast = diffs.length - 1;
    return diffs.some(
      (diff2, i) => diff2[0] === DIFF_EQUAL && (i !== iLast || diff2[1] !== "\n")
    );
  }
  return diffs.some((diff2) => diff2[0] === DIFF_EQUAL);
}
function diffStringsUnified(a, b, options) {
  if (a !== b && a.length !== 0 && b.length !== 0) {
    const isMultiline = a.includes("\n") || b.includes("\n");
    const [diffs, truncated] = diffStringsRaw(
      isMultiline ? `${a}
` : a,
      isMultiline ? `${b}
` : b,
      true,
      // cleanupSemantic
      options
    );
    if (hasCommonDiff(diffs, isMultiline)) {
      const optionsNormalized = normalizeDiffOptions(options);
      const lines = getAlignedDiffs(diffs, optionsNormalized.changeColor);
      return printDiffLines(lines, truncated, optionsNormalized);
    }
  }
  return diffLinesUnified(a.split("\n"), b.split("\n"), options);
}
function diffStringsRaw(a, b, cleanup, options) {
  const [diffs, truncated] = diffStrings(a, b, options);
  {
    diff_cleanupSemantic(diffs);
  }
  return [diffs, truncated];
}
function getCommonMessage(message, options) {
  const { commonColor } = normalizeDiffOptions(options);
  return commonColor(message);
}
const {
  AsymmetricMatcher,
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent
} = plugins;
const PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher,
  plugins.Error
];
const FORMAT_OPTIONS = {
  plugins: PLUGINS
};
const FALLBACK_FORMAT_OPTIONS = {
  callToJSON: false,
  maxDepth: 8,
  plugins: PLUGINS
};
function diff(a, b, options) {
  if (Object.is(a, b)) {
    return "";
  }
  const aType = getType(a);
  let expectedType = aType;
  let omitDifference = false;
  if (aType === "object" && typeof a.asymmetricMatch === "function") {
    if (a.$$typeof !== Symbol.for("jest.asymmetricMatcher")) {
      return void 0;
    }
    if (typeof a.getExpectedType !== "function") {
      return void 0;
    }
    expectedType = a.getExpectedType();
    omitDifference = expectedType === "string";
  }
  if (expectedType !== getType(b)) {
    let truncate2 = function(s) {
      return s.length <= MAX_LENGTH ? s : `${s.slice(0, MAX_LENGTH)}...`;
    };
    const { aAnnotation, aColor, aIndicator, bAnnotation, bColor, bIndicator } = normalizeDiffOptions(options);
    const formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    let aDisplay = format$1(a, formatOptions);
    let bDisplay = format$1(b, formatOptions);
    const MAX_LENGTH = 1e5;
    aDisplay = truncate2(aDisplay);
    bDisplay = truncate2(bDisplay);
    const aDiff = `${aColor(`${aIndicator} ${aAnnotation}:`)} 
${aDisplay}`;
    const bDiff = `${bColor(`${bIndicator} ${bAnnotation}:`)} 
${bDisplay}`;
    return `${aDiff}

${bDiff}`;
  }
  if (omitDifference) {
    return void 0;
  }
  switch (aType) {
    case "string":
      return diffLinesUnified(a.split("\n"), b.split("\n"), options);
    case "boolean":
    case "number":
      return comparePrimitive(a, b, options);
    case "map":
      return compareObjects(sortMap(a), sortMap(b), options);
    case "set":
      return compareObjects(sortSet(a), sortSet(b), options);
    default:
      return compareObjects(a, b, options);
  }
}
function comparePrimitive(a, b, options) {
  const aFormat = format$1(a, FORMAT_OPTIONS);
  const bFormat = format$1(b, FORMAT_OPTIONS);
  return aFormat === bFormat ? "" : diffLinesUnified(aFormat.split("\n"), bFormat.split("\n"), options);
}
function sortMap(map) {
  return new Map(Array.from(map.entries()).sort());
}
function sortSet(set) {
  return new Set(Array.from(set.values()).sort());
}
function compareObjects(a, b, options) {
  let difference;
  let hasThrown = false;
  try {
    const formatOptions = getFormatOptions(FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a, b, formatOptions, options);
  } catch {
    hasThrown = true;
  }
  const noDiffMessage = getCommonMessage(NO_DIFF_MESSAGE, options);
  if (difference === void 0 || difference === noDiffMessage) {
    const formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a, b, formatOptions, options);
    if (difference !== noDiffMessage && !hasThrown) {
      difference = `${getCommonMessage(
        SIMILAR_MESSAGE,
        options
      )}

${difference}`;
    }
  }
  return difference;
}
function getFormatOptions(formatOptions, options) {
  const { compareKeys, printBasicPrototype } = normalizeDiffOptions(options);
  return {
    ...formatOptions,
    compareKeys,
    printBasicPrototype
  };
}
function getObjectsDifference(a, b, formatOptions, options) {
  const formatOptionsZeroIndent = { ...formatOptions, indent: 0 };
  const aCompare = format$1(a, formatOptionsZeroIndent);
  const bCompare = format$1(b, formatOptionsZeroIndent);
  if (aCompare === bCompare) {
    return getCommonMessage(NO_DIFF_MESSAGE, options);
  } else {
    const aDisplay = format$1(a, formatOptions);
    const bDisplay = format$1(b, formatOptions);
    return diffLinesUnified2(
      aDisplay.split("\n"),
      bDisplay.split("\n"),
      aCompare.split("\n"),
      bCompare.split("\n"),
      options
    );
  }
}
const MAX_DIFF_STRING_LENGTH = 2e4;
function isAsymmetricMatcher(data) {
  const type = getType$1(data);
  return type === "Object" && typeof data.asymmetricMatch === "function";
}
function isReplaceable(obj1, obj2) {
  const obj1Type = getType$1(obj1);
  const obj2Type = getType$1(obj2);
  return obj1Type === obj2Type && (obj1Type === "Object" || obj1Type === "Array");
}
function printDiffOrStringify(received, expected, options) {
  const { aAnnotation, bAnnotation } = normalizeDiffOptions(options);
  if (typeof expected === "string" && typeof received === "string" && expected.length > 0 && received.length > 0 && expected.length <= MAX_DIFF_STRING_LENGTH && received.length <= MAX_DIFF_STRING_LENGTH && expected !== received) {
    if (expected.includes("\n") || received.includes("\n")) {
      return diffStringsUnified(expected, received, options);
    }
    const [diffs] = diffStringsRaw(expected, received);
    const hasCommonDiff2 = diffs.some((diff2) => diff2[0] === DIFF_EQUAL);
    const printLabel = getLabelPrinter(aAnnotation, bAnnotation);
    const expectedLine = printLabel(aAnnotation) + printExpected(
      getCommonAndChangedSubstrings(diffs, DIFF_DELETE, hasCommonDiff2)
    );
    const receivedLine = printLabel(bAnnotation) + printReceived(
      getCommonAndChangedSubstrings(diffs, DIFF_INSERT, hasCommonDiff2)
    );
    return `${expectedLine}
${receivedLine}`;
  }
  const clonedExpected = deepClone(expected, { forceWritable: true });
  const clonedReceived = deepClone(received, { forceWritable: true });
  const { replacedExpected, replacedActual } = replaceAsymmetricMatcher(clonedReceived, clonedExpected);
  const difference = diff(replacedExpected, replacedActual, options);
  return difference;
}
function replaceAsymmetricMatcher(actual, expected, actualReplaced = /* @__PURE__ */ new WeakSet(), expectedReplaced = /* @__PURE__ */ new WeakSet()) {
  if (actual instanceof Error && expected instanceof Error && typeof actual.cause !== "undefined" && typeof expected.cause === "undefined") {
    delete actual.cause;
    return {
      replacedActual: actual,
      replacedExpected: expected
    };
  }
  if (!isReplaceable(actual, expected)) {
    return { replacedActual: actual, replacedExpected: expected };
  }
  if (actualReplaced.has(actual) || expectedReplaced.has(expected)) {
    return { replacedActual: actual, replacedExpected: expected };
  }
  actualReplaced.add(actual);
  expectedReplaced.add(expected);
  getOwnProperties(expected).forEach((key) => {
    const expectedValue = expected[key];
    const actualValue = actual[key];
    if (isAsymmetricMatcher(expectedValue)) {
      if (expectedValue.asymmetricMatch(actualValue)) {
        actual[key] = expectedValue;
      }
    } else if (isAsymmetricMatcher(actualValue)) {
      if (actualValue.asymmetricMatch(expectedValue)) {
        expected[key] = actualValue;
      }
    } else if (isReplaceable(actualValue, expectedValue)) {
      const replaced = replaceAsymmetricMatcher(
        actualValue,
        expectedValue,
        actualReplaced,
        expectedReplaced
      );
      actual[key] = replaced.replacedActual;
      expected[key] = replaced.replacedExpected;
    }
  });
  return {
    replacedActual: actual,
    replacedExpected: expected
  };
}
function getLabelPrinter(...strings) {
  const maxLength = strings.reduce(
    (max, string) => string.length > max ? string.length : max,
    0
  );
  return (string) => `${string}: ${" ".repeat(maxLength - string.length)}`;
}
const SPACE_SYMBOL = "\xB7";
function replaceTrailingSpaces(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL.repeat(spaces.length));
}
function printReceived(object) {
  return s.red(replaceTrailingSpaces(stringify(object)));
}
function printExpected(value) {
  return s.green(replaceTrailingSpaces(stringify(value)));
}
function getCommonAndChangedSubstrings(diffs, op, hasCommonDiff2) {
  return diffs.reduce(
    (reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op ? hasCommonDiff2 ? s.inverse(diff2[1]) : diff2[1] : ""),
    ""
  );
}

const IS_RECORD_SYMBOL = "@@__IMMUTABLE_RECORD__@@";
const IS_COLLECTION_SYMBOL = "@@__IMMUTABLE_ITERABLE__@@";
function isImmutable(v) {
  return v && (v[IS_COLLECTION_SYMBOL] || v[IS_RECORD_SYMBOL]);
}
const OBJECT_PROTO = Object.getPrototypeOf({});
function getUnserializableMessage(err) {
  if (err instanceof Error) {
    return `<unserializable>: ${err.message}`;
  }
  if (typeof err === "string") {
    return `<unserializable>: ${err}`;
  }
  return "<unserializable>";
}
function serializeValue(val, seen = /* @__PURE__ */ new WeakMap()) {
  if (!val || typeof val === "string") {
    return val;
  }
  if (typeof val === "function") {
    return `Function<${val.name || "anonymous"}>`;
  }
  if (typeof val === "symbol") {
    return val.toString();
  }
  if (typeof val !== "object") {
    return val;
  }
  if (isImmutable(val)) {
    return serializeValue(val.toJSON(), seen);
  }
  if (val instanceof Promise || val.constructor && val.constructor.prototype === "AsyncFunction") {
    return "Promise";
  }
  if (typeof Element !== "undefined" && val instanceof Element) {
    return val.tagName;
  }
  if (typeof val.asymmetricMatch === "function") {
    return `${val.toString()} ${format(val.sample)}`;
  }
  if (typeof val.toJSON === "function") {
    return serializeValue(val.toJSON(), seen);
  }
  if (seen.has(val)) {
    return seen.get(val);
  }
  if (Array.isArray(val)) {
    const clone = new Array(val.length);
    seen.set(val, clone);
    val.forEach((e, i) => {
      try {
        clone[i] = serializeValue(e, seen);
      } catch (err) {
        clone[i] = getUnserializableMessage(err);
      }
    });
    return clone;
  } else {
    const clone = /* @__PURE__ */ Object.create(null);
    seen.set(val, clone);
    let obj = val;
    while (obj && obj !== OBJECT_PROTO) {
      Object.getOwnPropertyNames(obj).forEach((key) => {
        if (key in clone) {
          return;
        }
        try {
          clone[key] = serializeValue(val[key], seen);
        } catch (err) {
          delete clone[key];
          clone[key] = getUnserializableMessage(err);
        }
      });
      obj = Object.getPrototypeOf(obj);
    }
    return clone;
  }
}
function normalizeErrorMessage(message) {
  return message.replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "");
}
function processError(_err, diffOptions, seen = /* @__PURE__ */ new WeakSet()) {
  if (!_err || typeof _err !== "object") {
    return { message: String(_err) };
  }
  const err = _err;
  if (err.stack) {
    err.stackStr = String(err.stack);
  }
  if (err.name) {
    err.nameStr = String(err.name);
  }
  if (err.showDiff || err.showDiff === void 0 && err.expected !== void 0 && err.actual !== void 0) {
    err.diff = printDiffOrStringify(err.actual, err.expected, {
      ...diffOptions,
      ...err.diffOptions
    });
  }
  if (typeof err.expected !== "string") {
    err.expected = stringify(err.expected, 10);
  }
  if (typeof err.actual !== "string") {
    err.actual = stringify(err.actual, 10);
  }
  try {
    if (typeof err.message === "string") {
      err.message = normalizeErrorMessage(err.message);
    }
  } catch {
  }
  try {
    if (!seen.has(err) && typeof err.cause === "object") {
      seen.add(err);
      err.cause = processError(err.cause, diffOptions, seen);
    }
  } catch {
  }
  try {
    return serializeValue(err);
  } catch (e) {
    return serializeValue(
      new Error(
        `Failed to fully serialize error: ${e == null ? void 0 : e.message}
Inner error message: ${err == null ? void 0 : err.message}`
      )
    );
  }
}

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const relative = function(from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};

function createChainable(keys, fn) {
  function create(context) {
    const chain2 = function(...args) {
      return fn.apply(context, args);
    };
    Object.assign(chain2, fn);
    chain2.withContext = () => chain2.bind(context);
    chain2.setContext = (key, value) => {
      context[key] = value;
    };
    chain2.mergeContext = (ctx) => {
      Object.assign(context, ctx);
    };
    for (const key of keys) {
      Object.defineProperty(chain2, key, {
        get() {
          return create({ ...context, [key]: true });
        }
      });
    }
    return chain2;
  }
  const chain = create({});
  chain.fn = fn;
  return chain;
}
function interpretTaskModes(file, namePattern, testLocations, onlyMode, parentIsOnly, allowOnly) {
  const matchedLocations = [];
  const traverseSuite = (suite, parentIsOnly2, parentMatchedWithLocation) => {
    const suiteIsOnly = parentIsOnly2 || suite.mode === "only";
    suite.tasks.forEach((t) => {
      const includeTask = suiteIsOnly || t.mode === "only";
      if (onlyMode) {
        if (t.type === "suite" && (includeTask || someTasksAreOnly(t))) {
          if (t.mode === "only") {
            checkAllowOnly(t, allowOnly);
            t.mode = "run";
          }
        } else if (t.mode === "run" && !includeTask) {
          t.mode = "skip";
        } else if (t.mode === "only") {
          checkAllowOnly(t, allowOnly);
          t.mode = "run";
        }
      }
      let hasLocationMatch = parentMatchedWithLocation;
      if (testLocations !== void 0 && testLocations.length !== 0) {
        if (t.location && (testLocations == null ? void 0 : testLocations.includes(t.location.line))) {
          t.mode = "run";
          matchedLocations.push(t.location.line);
          hasLocationMatch = true;
        } else if (parentMatchedWithLocation) {
          t.mode = "run";
        } else if (t.type === "test") {
          t.mode = "skip";
        }
      }
      if (t.type === "test") {
        if (namePattern && !getTaskFullName(t).match(namePattern)) {
          t.mode = "skip";
        }
      } else if (t.type === "suite") {
        if (t.mode === "skip") {
          skipAllTasks(t);
        } else if (t.mode === "todo") {
          todoAllTasks(t);
        } else {
          traverseSuite(t, includeTask, hasLocationMatch);
        }
      }
    });
    if (suite.mode === "run" || suite.mode === "queued") {
      if (suite.tasks.length && suite.tasks.every((i) => i.mode !== "run" && i.mode !== "queued")) {
        suite.mode = "skip";
      }
    }
  };
  traverseSuite(file, parentIsOnly, false);
  const nonMatching = testLocations == null ? void 0 : testLocations.filter((loc) => !matchedLocations.includes(loc));
  if (nonMatching && nonMatching.length !== 0) {
    const message = nonMatching.length === 1 ? `line ${nonMatching[0]}` : `lines ${nonMatching.join(", ")}`;
    if (file.result === void 0) {
      file.result = {
        state: "fail",
        errors: []
      };
    }
    if (file.result.errors === void 0) {
      file.result.errors = [];
    }
    file.result.errors.push(
      processError(new Error(`No test found in ${file.name} in ${message}`))
    );
  }
}
function getTaskFullName(task) {
  return `${task.suite ? `${getTaskFullName(task.suite)} ` : ""}${task.name}`;
}
function someTasksAreOnly(suite) {
  return suite.tasks.some(
    (t) => t.mode === "only" || t.type === "suite" && someTasksAreOnly(t)
  );
}
function skipAllTasks(suite) {
  suite.tasks.forEach((t) => {
    if (t.mode === "run" || t.mode === "queued") {
      t.mode = "skip";
      if (t.type === "suite") {
        skipAllTasks(t);
      }
    }
  });
}
function todoAllTasks(suite) {
  suite.tasks.forEach((t) => {
    if (t.mode === "run" || t.mode === "queued") {
      t.mode = "todo";
      if (t.type === "suite") {
        todoAllTasks(t);
      }
    }
  });
}
function checkAllowOnly(task, allowOnly) {
  if (allowOnly) {
    return;
  }
  const error = processError(
    new Error(
      "[Vitest] Unexpected .only modifier. Remove it or pass --allowOnly argument to bypass this error"
    )
  );
  task.result = {
    state: "fail",
    errors: [error]
  };
}
function generateHash(str) {
  let hash = 0;
  if (str.length === 0) {
    return `${hash}`;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${hash}`;
}
function calculateSuiteHash(parent) {
  parent.tasks.forEach((t, idx) => {
    t.id = `${parent.id}_${idx}`;
    if (t.type === "suite") {
      calculateSuiteHash(t);
    }
  });
}
function createFileTask(filepath, root, projectName, pool) {
  const path = relative(root, filepath);
  const file = {
    id: generateFileHash(path, projectName),
    name: path,
    type: "suite",
    mode: "queued",
    filepath,
    tasks: [],
    meta: /* @__PURE__ */ Object.create(null),
    projectName,
    file: void 0,
    pool
  };
  file.file = file;
  return file;
}
function generateFileHash(file, projectName) {
  return generateHash(`${file}${projectName || ""}`);
}
function limitConcurrency(concurrency = Infinity) {
  let count = 0;
  let head;
  let tail;
  const finish = () => {
    count--;
    if (head) {
      head[0]();
      head = head[1];
      tail = head && tail;
    }
  };
  return (func, ...args) => {
    return new Promise((resolve) => {
      if (count++ < concurrency) {
        resolve();
      } else if (tail) {
        tail = tail[1] = [resolve];
      } else {
        head = tail = [resolve];
      }
    }).then(() => {
      return func(...args);
    }).finally(finish);
  };
}
function partitionSuiteChildren(suite) {
  let tasksGroup = [];
  const tasksGroups = [];
  for (const c of suite.tasks) {
    if (tasksGroup.length === 0 || c.concurrent === tasksGroup[0].concurrent) {
      tasksGroup.push(c);
    } else {
      tasksGroups.push(tasksGroup);
      tasksGroup = [c];
    }
  }
  if (tasksGroup.length > 0) {
    tasksGroups.push(tasksGroup);
  }
  return tasksGroups;
}
function isAtomTest(s) {
  return isTestCase(s);
}
function isTestCase(s) {
  return s.type === "test";
}
function getTests(suite) {
  const tests = [];
  const arraySuites = toArray(suite);
  for (const s of arraySuites) {
    if (isTestCase(s)) {
      tests.push(s);
    } else {
      for (const task of s.tasks) {
        if (isTestCase(task)) {
          tests.push(task);
        } else {
          const taskTests = getTests(task);
          for (const test of taskTests) {
            tests.push(test);
          }
        }
      }
    }
  }
  return tests;
}
function getTasks(tasks = []) {
  return toArray(tasks).flatMap(
    (s) => isTestCase(s) ? [s] : [s, ...getTasks(s.tasks)]
  );
}
function getSuites(suite) {
  return toArray(suite).flatMap(
    (s) => s.type === "suite" ? [s, ...getSuites(s.tasks)] : []
  );
}
function hasTests(suite) {
  return toArray(suite).some(
    (s) => s.tasks.some((c) => isTestCase(c) || hasTests(c))
  );
}
function hasFailed(suite) {
  return toArray(suite).some(
    (s) => {
      var _a;
      return ((_a = s.result) == null ? void 0 : _a.state) === "fail" || s.type === "suite" && hasFailed(s.tasks);
    }
  );
}
function getNames(task) {
  const names = [task.name];
  let current = task;
  while (current == null ? void 0 : current.suite) {
    current = current.suite;
    if (current == null ? void 0 : current.name) {
      names.unshift(current.name);
    }
  }
  if (current !== task.file) {
    names.unshift(task.file.name);
  }
  return names;
}
function getFullName(task, separator = " > ") {
  return getNames(task).join(separator);
}
function getTestName(task, separator = " > ") {
  return getNames(task).slice(1).join(separator);
}

class StateManager {
  filesMap = /* @__PURE__ */ new Map();
  pathsSet = /* @__PURE__ */ new Set();
  idMap = /* @__PURE__ */ new Map();
  getPaths() {
    return Array.from(this.pathsSet);
  }
  /**
   * Return files that were running or collected.
   */
  getFiles(keys) {
    if (keys) {
      return keys.map((key) => this.filesMap.get(key)).flat().filter((file) => file && !file.local);
    }
    return Array.from(this.filesMap.values()).flat().filter((file) => !file.local);
  }
  getFilepaths() {
    return Array.from(this.filesMap.keys());
  }
  getFailedFilepaths() {
    return this.getFiles().filter((i) => i.result?.state === "fail").map((i) => i.filepath);
  }
  collectPaths(paths = []) {
    paths.forEach((path) => {
      this.pathsSet.add(path);
    });
  }
  collectFiles(files = []) {
    files.forEach((file) => {
      const existing = this.filesMap.get(file.filepath) || [];
      const otherProject = existing.filter(
        (i) => i.projectName !== file.projectName || i.meta.typecheck !== file.meta.typecheck
      );
      const currentFile = existing.find(
        (i) => i.projectName === file.projectName
      );
      if (currentFile) {
        file.logs = currentFile.logs;
      }
      otherProject.push(file);
      this.filesMap.set(file.filepath, otherProject);
      this.updateId(file);
    });
  }
  // this file is reused by ws-client, and should not rely on heavy dependencies like workspace
  clearFiles(_project, paths = []) {
    const project = _project;
    paths.forEach((path) => {
      const files = this.filesMap.get(path);
      const fileTask = createFileTask(
        path,
        project.config.root,
        project.config.name || ""
      );
      fileTask.local = true;
      this.idMap.set(fileTask.id, fileTask);
      if (!files) {
        this.filesMap.set(path, [fileTask]);
        return;
      }
      const filtered = files.filter(
        (file) => file.projectName !== project.config.name
      );
      if (!filtered.length) {
        this.filesMap.set(path, [fileTask]);
      } else {
        this.filesMap.set(path, [...filtered, fileTask]);
      }
    });
  }
  updateId(task) {
    if (this.idMap.get(task.id) === task) {
      return;
    }
    this.idMap.set(task.id, task);
    if (task.type === "suite") {
      task.tasks.forEach((task2) => {
        this.updateId(task2);
      });
    }
  }
  updateTasks(packs) {
    for (const [id, result, meta] of packs) {
      const task = this.idMap.get(id);
      if (task) {
        task.result = result;
        task.meta = meta;
        if (result?.state === "skip") {
          task.mode = "skip";
        }
      }
    }
  }
  updateUserLog(log) {
    const task = log.taskId && this.idMap.get(log.taskId);
    if (task) {
      if (!task.logs) {
        task.logs = [];
      }
      task.logs.push(log);
    }
  }
}

function hasBenchmark(suite) {
  return toArray(suite).some(
    (s) => s?.tasks?.some((c) => c.meta?.benchmark || hasBenchmark(c))
  );
}
function hasFailedSnapshot(suite) {
  return getTests(suite).some((s) => {
    return s.result?.errors?.some(
      (e) => typeof e?.message === "string" && e.message.match(/Snapshot .* mismatched/)
    );
  });
}
function convertTasksToEvents(file, onTask) {
  const packs = [];
  const events = [];
  function visit(suite) {
    onTask?.(suite);
    packs.push([suite.id, suite.result, suite.meta]);
    events.push([suite.id, "suite-prepare"]);
    suite.tasks.forEach((task) => {
      if (task.type === "suite") {
        visit(task);
      } else {
        onTask?.(task);
        packs.push([task.id, task.result, task.meta]);
        if (task.mode !== "skip" && task.mode !== "todo") {
          events.push([task.id, "test-prepare"], [task.id, "test-finished"]);
        }
      }
    });
    events.push([suite.id, "suite-finished"]);
  }
  visit(file);
  return { packs, events };
}

function createClient(url, options = {}) {
  const {
    handlers = {},
    autoReconnect = true,
    reconnectInterval = 2e3,
    reconnectTries = 10,
    connectTimeout = 6e4,
    reactive = (v) => v,
    WebSocketConstructor = globalThis.WebSocket
  } = options;
  let tries = reconnectTries;
  const ctx = reactive({
    ws: new WebSocketConstructor(url),
    state: new StateManager(),
    waitForConnection,
    reconnect
  }, "state");
  ctx.state.filesMap = reactive(ctx.state.filesMap, "filesMap");
  ctx.state.idMap = reactive(ctx.state.idMap, "idMap");
  let onMessage;
  const functions = {
    onSpecsCollected(specs) {
      specs?.forEach(([config, file]) => {
        ctx.state.clearFiles({ config }, [file]);
      });
      handlers.onSpecsCollected?.(specs);
    },
    onPathsCollected(paths) {
      ctx.state.collectPaths(paths);
      handlers.onPathsCollected?.(paths);
    },
    onCollected(files) {
      ctx.state.collectFiles(files);
      handlers.onCollected?.(files);
    },
    onTaskUpdate(packs) {
      ctx.state.updateTasks(packs);
      handlers.onTaskUpdate?.(packs);
    },
    onUserConsoleLog(log) {
      ctx.state.updateUserLog(log);
      handlers.onUserConsoleLog?.(log);
    },
    onFinished(files, errors) {
      handlers.onFinished?.(files, errors);
    },
    onFinishedReportCoverage() {
      handlers.onFinishedReportCoverage?.();
    }
  };
  const birpcHandlers = {
    post: (msg) => ctx.ws.send(msg),
    on: (fn) => onMessage = fn,
    serialize: (e) => stringify$1(e, (_, v) => {
      if (v instanceof Error) {
        return {
          name: v.name,
          message: v.message,
          stack: v.stack
        };
      }
      return v;
    }),
    deserialize: parse,
    onTimeoutError(functionName) {
      throw new Error(`[vitest-ws-client]: Timeout calling "${functionName}"`);
    }
  };
  ctx.rpc = createBirpc(
    functions,
    birpcHandlers
  );
  let openPromise;
  function reconnect(reset = false) {
    if (reset) {
      tries = reconnectTries;
    }
    ctx.ws = new WebSocketConstructor(url);
    registerWS();
  }
  function registerWS() {
    openPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Cannot connect to the server in ${connectTimeout / 1e3} seconds`
          )
        );
      }, connectTimeout)?.unref?.();
      if (ctx.ws.OPEN === ctx.ws.readyState) {
        resolve();
      }
      ctx.ws.addEventListener("open", () => {
        tries = reconnectTries;
        resolve();
        clearTimeout(timeout);
      });
    });
    ctx.ws.addEventListener("message", (v) => {
      onMessage(v.data);
    });
    ctx.ws.addEventListener("close", () => {
      tries -= 1;
      if (autoReconnect && tries > 0) {
        setTimeout(reconnect, reconnectInterval);
      }
    });
  }
  registerWS();
  function waitForConnection() {
    return openPromise;
  }
  return ctx;
}

export { calculateSuiteHash, convertTasksToEvents, createChainable, createClient, createFileTask, generateFileHash, generateHash, getFullName, getNames, getSuites, getTasks, getTestName, getTests, hasBenchmark, hasFailed, hasFailedSnapshot, hasTests, interpretTaskModes, isAtomTest, isTestCase, limitConcurrency, partitionSuiteChildren, someTasksAreOnly };
