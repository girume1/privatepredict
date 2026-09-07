/**
 * Browser shim for Node's `assert` module.
 *
 * Several transitive dependencies of the Midnight SDK
 * (@subsquid/scale-codec, @subsquid/util-internal-hex) `require("assert")`
 * and call it unconditionally while encoding/decoding. Vite/Rolldown
 * externalizes the Node built-in for the browser, leaving the binding
 * undefined — so the first executed assertion would throw
 * `TypeError: ... is not a function`. Aliasing the bare specifier (and its
 * `node:` form) to this file keeps those code paths functional in the
 * browser bundle. Deliberately mirrors the small subset of the Node API the
 * dependency tree actually uses; deep-equality helpers are best-effort.
 */

export type AssertFunction = (
  condition: unknown,
  message?: string,
) => asserts condition;

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion failed");
  }
}

function fail(message?: string): never {
  throw new Error(message ?? "Assertion failed");
}

function equal(actual: unknown, expected: unknown, message?: string): void {
  // Deliberate loose equality to match Node's assert.equal semantics.
  if (actual != expected) {
    throw new Error(message ?? `${format(actual)} != ${format(expected)}`);
  }
}

function notEqual(actual: unknown, expected: unknown, message?: string): void {
  // Deliberate loose equality to match Node's assert.notEqual semantics.
  if (actual == expected) {
    throw new Error(message ?? `${format(actual)} == ${format(expected)}`);
  }
}

function strictEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (actual !== expected) {
    throw new Error(message ?? `${format(actual)} !== ${format(expected)}`);
  }
}

function notStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (actual === expected) {
    throw new Error(message ?? `${format(actual)} === ${format(expected)}`);
  }
}

function deepEqual(actual: unknown, expected: unknown, message?: string): void {
  if (!looselyDeepEqual(actual, expected)) {
    throw new Error(
      message ?? `${format(actual)} not deep-equal to ${format(expected)}`,
    );
  }
}

function notDeepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (looselyDeepEqual(actual, expected)) {
    throw new Error(
      message ?? `${format(actual)} deep-equal to ${format(expected)}`,
    );
  }
}

function deepStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (!strictDeepEqual(actual, expected)) {
    throw new Error(
      message ??
        `${format(actual)} not deepStrict-equal to ${format(expected)}`,
    );
  }
}

function notDeepStrictEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (strictDeepEqual(actual, expected)) {
    throw new Error(
      message ?? `${format(actual)} deepStrict-equal to ${format(expected)}`,
    );
  }
}

function ifError(value: unknown): asserts value is null | undefined {
  if (value !== null && value !== undefined) {
    throw new Error(format(value));
  }
}

function format(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function looselyDeepEqual(actual: unknown, expected: unknown): boolean {
  if (actual == null || expected == null) {
    // Mirrors Node's loose semantics.
    return actual == expected;
  }
  return format(actual) === format(expected);
}

function strictDeepEqual(actual: unknown, expected: unknown): boolean {
  if (actual === expected) {
    return true;
  }
  if (actual == null || expected == null) {
    return false;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected)
      ? actual.length === expected.length &&
          actual.every((entry, index) =>
            strictDeepEqual(entry, expected[index]),
          )
      : false;
  }
  if (typeof actual === "object" && typeof expected === "object") {
    const actualRecord = actual as Record<string, unknown>;
    const expectedRecord = expected as Record<string, unknown>;
    const actualKeys = Object.keys(actualRecord).sort();
    const expectedKeys = Object.keys(expectedRecord).sort();
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return actualKeys.every(
      (key, index) =>
        key === expectedKeys[index] &&
        strictDeepEqual(actualRecord[key], expectedRecord[key]),
    );
  }
  // Fall back to loose equality for primitives.
  return actual == expected;
}

export const ok = assert;
export { assert as default };
export const strict = {
  assert,
  ok: assert,
  equal: strictEqual,
  notEqual: notStrictEqual,
  deepEqual: deepStrictEqual,
  notDeepEqual: notDeepStrictEqual,
  strictEqual,
  notStrictEqual,
  deepStrictEqual,
  notDeepStrictEqual,
  fail,
  ifError,
};
export {
  assert,
  fail,
  equal,
  notEqual,
  strictEqual,
  notStrictEqual,
  deepEqual,
  notDeepEqual,
  deepStrictEqual,
  notDeepStrictEqual,
  ifError,
};
