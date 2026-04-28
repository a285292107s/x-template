/**
 * Dota 2 Custom Game Test Framework
 *
 * A comprehensive Jest-style testing framework for the Dota 2 VScript runtime.
 *
 * Features:
 * - Jest-compatible API: describe, it, test, beforeEach, afterEach, etc.
 * - Data-driven testing: .each() for describe and it
 * - Full matcher set: toBe, toEqual, toThrow, toHaveProperty, toMatchObject, etc.
 * - .not modifier, .resolves / .rejects for async assertions
 * - Asymmetric matchers: expect.any(), expect.objectContaining(), etc.
 * - Mock function support: fn(), spyOn()
 * - Async support via Timers.CreateTimer
 * - Chat command integration: -tx / -tx SuiteName
 *
 * IMPORTANT: This framework is designed for the Lua runtime (Dota 2 VScript).
 * Key Lua/JS semantic differences are handled:
 * - Lua `0` and `""` are truthy (framework treats them as falsy for Jest compat)
 * - Lua `nil` represents both `null` and `undefined`
 * - Lua arrays use 1-based indexing, TSTL compiles JS arrays to Lua tables
 * - `typeof` compiles to Lua `type()`, objects/arrays return "table"
 */

// ============================================================================
// Lua runtime helpers
// ============================================================================

/** Lua's built-in `type()` function — returns "nil", "number", "string", "table", etc. */
/** @noSelf */
declare function type(val: unknown): string;

/** Lua's built-in `pairs()` — iterates all keys of a table */
/** @noSelf */
declare function pairs(t: object): LuaIterator;

/** Lua's built-in `tonumber()` — converts a value to number */
/** @noSelf */
declare function tonumber(val: unknown): number | undefined;

/** Lua iterator return type */
interface LuaIterator {
    [Symbol.iterator](): IterableIterator<[string, unknown]>;
}

// ============================================================================
// Types
// ============================================================================

type TestFn = () => void | Promise<void>;
type HookFn = TestFn;

interface TestCase {
    name: string;
    fn: TestFn;
    skip: boolean;
    only: boolean;
    failing: boolean;
    todo: boolean;
}

interface TestSuite {
    name: string;
    cases: TestCase[];
    beforeEachFn: HookFn | null;
    afterEachFn: HookFn | null;
    beforeAllFn: HookFn | null;
    afterAllFn: HookFn | null;
    skip: boolean;
    only: boolean;
}

// ============================================================================
// State
// ============================================================================

let suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
let onlyMode = false; // true if any .only() was used

// Assertion counting state
let _assertionCount = 0;
let _assertionTarget = 0; // 0 = no check, -1 = hasAssertions, >0 = exact count

// ============================================================================
// Helper: format values for error messages
// ============================================================================

function format(val: unknown): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'number' || typeof val === 'boolean') return tostring(val);
    return tostring(val);
}

/** Check if a value is a Lua table (object/array) */
function isTable(val: unknown): boolean {
    return type(val) === 'table';
}

/** Get the length of an array-like value. Works with both JS arrays and Lua tables. */
function getLength(val: unknown): number | undefined {
    if (typeof val === 'string') return (val as string).length;
    if (isTable(val)) {
        const obj = val as Record<string, unknown>;
        // Try .length property first (TSTL arrays have it)
        if (obj.length !== undefined && typeof obj.length === 'number') {
            return obj.length as number;
        }
        // Fall back to Lua # operator — but rawlen is not available in Dota 2 VScript
        // (LuaJIT / Lua 5.1 doesn't have rawlen).
        // Instead, we use the # operator which works for array-like tables.
        // We must call it via table access to avoid TSTL's self injection.
        // In compiled Lua, #val gives the array part length.
        // Since we can't use rawlen, we use a simple trick:
        // Count sequential numeric keys starting from 1.
        let len = 0;
        for (const k in obj) {
            const n = tonumber(k);
            if (n !== undefined && n === len + 1) {
                len++;
            }
        }
        return len > 0 ? len : undefined;
    }
    return undefined;
}

/**
 * Check if a value is falsy in the Jest sense.
 * In Lua, `0` and `""` are truthy, but in Jest they are falsy.
 * We match Jest semantics for consistency.
 */
function isFalsy(val: unknown): boolean {
    if (val === null || val === undefined) return true;
    if (val === 0) return true;
    if (val === '') return true;
    if (val === false) return true;
    return false;
}

/**
 * Collect all keys from a table using Lua pairs().
 * Returns both numeric and string keys, just like pairs() does.
 */
function collectKeys(t: object): string[] {
    const keys: string[] = [];
    for (const k in t as Record<string, unknown>) {
        keys.push(k);
    }
    return keys;
}

// ============================================================================
// Deep equality — handles Lua table semantics and asymmetric matchers
// ============================================================================

function deepEqual(a: unknown, b: unknown): boolean {
    // Fast path: strict equality
    if (a === b) return true;
    // Both nil
    if (a === null && b === null) return true;
    if (a === undefined && b === undefined) return true;
    // In Lua, null and undefined are both nil
    if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
    // One is nil, other is not
    if (a === null || a === undefined || b === null || b === undefined) return false;

    // Check asymmetric matchers on the expected side
    if (isAsymmetricMatcher(b)) {
        return b.asymmetricMatch(a);
    }
    if (isAsymmetricMatcher(a)) {
        // If actual is an asymmetric matcher (rare), compare with expected
        return a.asymmetricMatch(b);
    }

    // If either is not a table, use strict equality
    if (!isTable(a) || !isTable(b)) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    // Collect keys from both sides
    const keysA = collectKeys(a as Record<string, unknown>);
    const keysB = collectKeys(b as Record<string, unknown>);

    // Both must have the same number of keys
    if (keysA.length !== keysB.length) return false;

    // Build a set of keys from b for O(1) lookup
    const keysBSet: Record<string, boolean> = {};
    for (const k of keysB) keysBSet[k] = true;

    // Check all keys from a exist in b with equal values
    for (const k of keysA) {
        if (!keysBSet[k]) return false;
        if (!deepEqual(aObj[k], bObj[k])) return false;
    }
    return true;
}

/** Strict deep equal: same as deepEqual in Lua runtime (no undefined vs null distinction possible) */
function strictDeepEqual(a: unknown, b: unknown): boolean {
    // Same logic as deepEqual — in Lua, there's no undefined vs null distinction
    return deepEqual(a, b);
}

/** Check if `obj` contains all properties of `subset` with matching values */
function matchObject(obj: unknown, subset: unknown): boolean {
    if (obj === subset) return true;
    // Handle nil
    if ((obj === null || obj === undefined) && (subset === null || subset === undefined)) return true;
    if (subset === null || subset === undefined) return obj === subset;
    if (obj === null || obj === undefined) return false;

    // Check asymmetric matchers on the subset side
    if (isAsymmetricMatcher(subset)) {
        return subset.asymmetricMatch(obj);
    }

    if (!isTable(subset)) return obj === subset;
    if (!isTable(obj)) return false;

    const sub = subset as Record<string, unknown>;
    const o = obj as Record<string, unknown>;

    for (const k in sub) {
        const subVal = sub[k];
        const objVal = o[k];

        if (isAsymmetricMatcher(subVal)) {
            if (!subVal.asymmetricMatch(objVal)) return false;
        } else if (isTable(subVal) && subVal !== null && subVal !== undefined && !isAsymmetricMatcher(subVal)) {
            if (!matchObject(objVal, subVal)) return false;
        } else {
            if (!deepEqual(objVal, subVal)) return false;
        }
    }
    return true;
}

/** Get a nested property via dot-path or array path */
function getByPath(obj: unknown, path: string | string[]): unknown {
    const segments = typeof path === 'string' ? path.split('.') : path;
    let current = obj;
    for (const seg of segments) {
        if (current === null || current === undefined) return undefined;
        current = (current as Record<string, unknown>)[seg];
    }
    return current;
}

function incrementAssertionCount(): void {
    _assertionCount++;
}

function checkAssertionCount(): string | null {
    if (_assertionTarget === 0) return null;
    if (_assertionTarget === -1) {
        if (_assertionCount === 0) return `Expected at least 1 assertion, but found 0`;
        return null;
    }
    if (_assertionCount !== _assertionTarget) {
        return `Expected ${_assertionTarget} assertion(s), but found ${_assertionCount}`;
    }
    return null;
}

// ============================================================================
// Asymmetric Matchers
// ============================================================================

interface AsymmetricMatcher {
    __asymmetric: boolean;
    asymmetricMatch(other: unknown): boolean;
    toString(): string;
}

function isAsymmetricMatcher(val: unknown): val is AsymmetricMatcher {
    return val !== null && val !== undefined && isTable(val) && (val as any).__asymmetric === true;
}

/** Match any value using an asymmetric matcher or strict equality */
function matchValue(actual: unknown, expected: unknown): boolean {
    if (isAsymmetricMatcher(expected)) {
        return expected.asymmetricMatch(actual);
    }
    if (isAsymmetricMatcher(actual)) {
        return actual.asymmetricMatch(expected);
    }
    // In Lua, null and undefined are both nil
    if ((actual === null || actual === undefined) && (expected === null || expected === undefined)) return true;
    return actual === expected;
}

class AnyMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private constructorFn: Function | undefined) {}

    asymmetricMatch(other: unknown): boolean {
        if (this.constructorFn === undefined) return other !== undefined && other !== null;
        if (this.constructorFn === Number) return typeof other === 'number';
        if (this.constructorFn === String) return typeof other === 'string';
        if (this.constructorFn === Boolean) return typeof other === 'boolean';
        return other instanceof (this.constructorFn as any);
    }

    toString(): string {
        if (this.constructorFn === undefined) return 'expect.anything()';
        return `expect.any(${this.constructorFn.name || 'Function'})`;
    }
}

class ArrayContainingMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private sample: unknown[], private negated: boolean) {}

    asymmetricMatch(other: unknown): boolean {
        if (!isTable(other)) return false;
        const arr = other as unknown[];
        for (const item of this.sample) {
            const found = arr.some(a => deepEqual(a, item));
            if (this.negated) {
                if (found) return false;
            } else {
                if (!found) return false;
            }
        }
        return true;
    }

    toString(): string {
        return this.negated ? 'expect.not.arrayContaining(...)' : 'expect.arrayContaining(...)';
    }
}

class ObjectContainingMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private sample: Record<string, unknown>, private negated: boolean) {}

    asymmetricMatch(other: unknown): boolean {
        if (!isTable(other)) return false;
        const obj = other as Record<string, unknown>;
        for (const k in this.sample) {
            const sampleVal = this.sample[k];
            const objVal = obj[k];
            const match = isAsymmetricMatcher(sampleVal) ? sampleVal.asymmetricMatch(objVal) : deepEqual(objVal, sampleVal);
            if (this.negated) {
                if (match) return false;
            } else {
                if (!match) return false;
            }
        }
        return true;
    }

    toString(): string {
        return this.negated ? 'expect.not.objectContaining(...)' : 'expect.objectContaining(...)';
    }
}

class StringContainingMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private sample: string, private negated: boolean) {}

    asymmetricMatch(other: unknown): boolean {
        if (typeof other !== 'string') return false;
        const found = (other as string).indexOf(this.sample) !== -1;
        return this.negated ? !found : found;
    }

    toString(): string {
        return this.negated ? 'expect.not.stringContaining(...)' : 'expect.stringContaining(...)';
    }
}

class StringMatchingMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private pattern: string, private negated: boolean) {}

    asymmetricMatch(other: unknown): boolean {
        if (typeof other !== 'string') return false;
        const found = (other as string).indexOf(this.pattern) !== -1;
        return this.negated ? !found : found;
    }

    toString(): string {
        return this.negated ? 'expect.not.stringMatching(...)' : 'expect.stringMatching(...)';
    }
}

class CloseToMatcher implements AsymmetricMatcher {
    __asymmetric = true;
    constructor(private expected: number, private precision: number) {}

    asymmetricMatch(other: unknown): boolean {
        if (typeof other !== 'number') return false;
        const diff = Math.abs((other as number) - this.expected);
        const threshold = Math.pow(10, -this.precision) / 2;
        return diff < threshold;
    }

    toString(): string {
        return `expect.closeTo(${this.expected}, ${this.precision})`;
    }
}

// ============================================================================
// expect — entry point function (declared before namespace for TS merging)
// ============================================================================

/** Entry point for assertions. */
function expect(actual: unknown): Expect {
    return new Expect(actual);
}

// ============================================================================
// expect namespace — asymmetric matchers + stubs
// (MUST be declared after the function for TS declaration merging)
// ============================================================================

namespace expect {
    /** Matches anything except null or undefined. */
    export function anything(): AsymmetricMatcher {
        return new AnyMatcher(undefined);
    }

    /** Matches any value created with the given constructor. */
    export function any(constructorFn: Function): AsymmetricMatcher {
        return new AnyMatcher(constructorFn);
    }

    /** Matches arrays containing all the specified items. */
    export function arrayContaining(sample: unknown[]): AsymmetricMatcher {
        return new ArrayContainingMatcher(sample, false);
    }

    /** Matches arrays NOT containing all the specified items. */
    export namespace not {
        export function arrayContaining(sample: unknown[]): AsymmetricMatcher {
            return new ArrayContainingMatcher(sample, true);
        }
        export function objectContaining(sample: Record<string, unknown>): AsymmetricMatcher {
            return new ObjectContainingMatcher(sample, true);
        }
        export function stringContaining(sample: string): AsymmetricMatcher {
            return new StringContainingMatcher(sample, true);
        }
        export function stringMatching(pattern: string): AsymmetricMatcher {
            return new StringMatchingMatcher(pattern, true);
        }
    }

    /** Matches objects containing all the specified properties. */
    export function objectContaining(sample: Record<string, unknown>): AsymmetricMatcher {
        return new ObjectContainingMatcher(sample, false);
    }

    /** Matches strings containing the specified substring. */
    export function stringContaining(sample: string): AsymmetricMatcher {
        return new StringContainingMatcher(sample, false);
    }

    /** Matches strings matching the specified pattern. */
    export function stringMatching(pattern: string): AsymmetricMatcher {
        return new StringMatchingMatcher(pattern, false);
    }

    /** Compares floating-point numbers for approximate equality (inside toEqual/toContainEqual). */
    export function closeTo(expected: number, precision: number = 2): AsymmetricMatcher {
        return new CloseToMatcher(expected, precision);
    }

    /** Verifies that a certain number of assertions are called during a test. */
    export function assertions(num: number): void {
        _assertionCount = 0;
        _assertionTarget = num;
    }

    /** Verifies that at least one assertion is called during a test. */
    export function hasAssertions(): void {
        _assertionCount = 0;
        _assertionTarget = -1;
    }

    /**
     * Add custom matchers. NOT IMPLEMENTED in Dota 2 runtime.
     * Stub — placeholder for API compatibility.
     */
    export function extend(_matchers: Record<string, (received: unknown, ...args: unknown[]) => { pass: boolean; message: () => string }>): void {
        print('[TestFramework] expect.extend() is not supported in Dota 2 runtime. Custom matchers cannot be added.');
    }

    /**
     * Add custom equality testers. NOT IMPLEMENTED in Dota 2 runtime.
     */
    export function addEqualityTesters(_testers: unknown[]): void {
        print('[TestFramework] expect.addEqualityTesters() is not supported in Dota 2 runtime.');
    }

    /**
     * Add custom snapshot serializer. NOT IMPLEMENTED — snapshots not supported in Dota 2.
     */
    export function addSnapshotSerializer(_serializer: unknown): void {
        print(
            '[TestFramework] expect.addSnapshotSerializer() is not supported. Snapshots require a filesystem which is not available in Dota 2 VScript.'
        );
    }
}

// ============================================================================
// Mock Functions
// ============================================================================

export interface Mock<T extends (...args: any[]) => any = (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    /** List of all calls, each call is an array of arguments */
    calls: unknown[][];
    /** Results of each call: { type: 'return' | 'throw', value: unknown } */
    results: { type: string; value: unknown }[];
    /** Reset all call tracking */
    mockClear(): void;
    /** Reset all call tracking AND implementation */
    mockReset(): void;
    /** Replace implementation */
    mockImplementation(fn: T): Mock<T>;
    /** Replace implementation for one call only */
    mockImplementationOnce(fn: T): Mock<T>;
    /** Make mock return a value */
    mockReturnValue(value: ReturnType<T>): Mock<T>;
    /** Make mock return a value once */
    mockReturnValueOnce(value: ReturnType<T>): Mock<T>;
    /** Make mock throw — STUB */
    mockRejectedValue?(_value: unknown): Mock<T>;
    /** Make mock resolve — STUB */
    mockResolvedValue?(_value: unknown): Mock<T>;
}

/** @noSelf */
type NoSelfFn = (...args: any[]) => any;

interface MockState {
    impl: ((...args: any[]) => any) | null;
    implQueue: ((...args: any[]) => any)[];
    calls: unknown[][];
    results: { type: string; value: unknown }[];
    returnValueQueue: unknown[];
    defaultReturnValue: unknown;
    // Spy-specific: stores the original function and target object
    _spyOriginal: NoSelfFn | null;
    _spyTarget: Record<string, any> | null;
}

function createMock<T extends (...args: any[]) => any = (...args: any[]) => any>(impl?: (...args: any[]) => any): Mock<T> {
    const state: MockState = {
        impl: impl || null,
        implQueue: [],
        calls: [],
        results: [],
        returnValueQueue: [],
        defaultReturnValue: undefined,
        _spyOriginal: null,
        _spyTarget: null,
    };

    const mock = function (this: unknown, ...args: any[]): any {
        // Record the call args (without self/this, matching Jest behavior)
        state.calls.push(args);

        let implFn = state.impl;
        if (state.implQueue.length > 0) {
            implFn = state.implQueue.shift()!;
        }

        let result: { type: string; value: unknown };
        try {
            let value: unknown;
            if (implFn) {
                // TSTL always injects nil self before plain function call args.
                //   implFn(this, ...args) compiles to implFn(nil, this, unpack(args))
                // which makes the impl receive self=nil, arg1=this, arg2=args[0], ...
                // offsetting all user arguments by 1.
                //
                // WORKAROUND: Store impl on the mock object under a temporary key,
                // then call via object method syntax. TSTL compiles
                //   mock.__mockImpl(...args) to mock:__mockImpl(unpack(args))
                // which passes mock as self correctly and keeps args aligned!
                (mock as any).__mockImpl = implFn;
                value = (mock as any).__mockImpl(...args);
            } else if (state._spyOriginal && state._spyTarget) {
                // For spyOn: same TSTL self-injection workaround.
                const target = state._spyTarget;
                target.__spyCallOriginal = state._spyOriginal;
                value = target.__spyCallOriginal(...args);
            } else if (state.returnValueQueue.length > 0) {
                value = state.returnValueQueue.shift();
            } else {
                value = state.defaultReturnValue;
            }
            result = { type: 'return', value };
        } catch (e) {
            result = { type: 'throw', value: e };
        }
        state.results.push(result);

        if (result.type === 'throw') {
            throw result.value;
        }
        return result.value;
    } as Mock<T>;

    (mock as any)._state = state;

    mock.calls = state.calls;
    mock.results = state.results;

    mock.mockClear = () => {
        state.calls.length = 0;
        state.results.length = 0;
        state.implQueue.length = 0;
        state.returnValueQueue.length = 0;
    };

    mock.mockReset = () => {
        mock.mockClear();
        state.impl = null;
        state.defaultReturnValue = undefined;
    };

    mock.mockImplementation = (fn: T) => {
        state.impl = fn;
        return mock;
    };

    mock.mockImplementationOnce = (fn: T) => {
        state.implQueue.push(fn);
        return mock;
    };

    mock.mockReturnValue = (value: ReturnType<T>) => {
        state.impl = null;
        state.defaultReturnValue = value;
        return mock;
    };

    mock.mockReturnValueOnce = (value: ReturnType<T>) => {
        state.returnValueQueue.push(value);
        return mock;
    };

    mock.mockRejectedValue = (_value: unknown) => {
        print('[TestFramework] mock.mockRejectedValue() — async mocks have limited support in Dota 2 runtime');
        return mock;
    };

    mock.mockResolvedValue = (_value: unknown) => {
        print('[TestFramework] mock.mockResolvedValue() — async mocks have limited support in Dota 2 runtime');
        return mock;
    };

    return mock;
}

/**
 * Create a mock function. Optionally pass an implementation.
 * @example
 * ```ts
 * const fn = jest_fn();
 * const addFn = jest_fn((a, b) => a + b);
 * ```
 */
export const jest_fn = createMock;

/**
 * Create a mock/spy on an object method.
 * In Dota 2 VScript, `spyOn` replaces the method on the object with a mock.
 * Call `restoreSpy()` or manually restore to undo.
 *
 * NOTE: In TSTL, object methods compile with an implicit `self` parameter.
 * We store the original function in mock._state._spyOriginal and call it
 * directly from createMock's __call, bypassing TSTL's self-injection issue.
 */
export function spyOn(object: Record<string, any>, method: string): Mock {
    const original = object[method];
    if (typeof original !== 'function') {
        error(`spyOn: ${method} is not a function`);
    }

    // Create a mock WITHOUT an impl — we'll use _spyOriginal/_spyTarget instead
    const spy = createMock();

    // Store spy info in mock state (used by createMock's __call)
    (spy as any)._state._spyOriginal = original as NoSelfFn;
    (spy as any)._state._spyTarget = object;

    // Also store on the mock object itself for restoreSpy
    (spy as any)._spyTarget = object;
    (spy as any)._spyMethod = method;
    (spy as any)._spyOriginal = original;

    object[method] = spy;
    return spy;
}

/** Restore a spy created by spyOn */
export function restoreSpy(spy: Mock): void {
    const s = spy as any;
    if (s._spyTarget && s._spyMethod !== undefined) {
        s._spyTarget[s._spyMethod] = s._spyOriginal;
        s._spyTarget = null;
        s._spyMethod = null;
        s._spyOriginal = null;
    }
}

// ============================================================================
// Expect / Matchers
// ============================================================================

export class Expect {
    constructor(private actual: unknown, private negated: boolean = false, private promiseModifier: 'none' | 'resolves' | 'rejects' = 'none') {}

    private _assert(pass: boolean, msg: string, negMsg: string): void {
        incrementAssertionCount();
        const ok = this.negated ? !pass : pass;
        if (!ok) {
            error(this.negated ? negMsg : msg);
        }
    }

    /** Invert the next matcher. */
    get not(): Expect {
        return new Expect(this.actual, !this.negated, this.promiseModifier);
    }

    /** Resolve the Promise and apply matchers to the fulfilled value. Use with `await`. */
    get resolves(): Expect {
        if (!isTable(this.actual) || this.actual === null || typeof (this.actual as any).then !== 'function') {
            error('expect.resolves: value is not a Promise');
        }
        return new Expect(this.actual, this.negated, 'resolves');
    }

    /** Reject the Promise and apply matchers to the rejection reason. Use with `await`. */
    get rejects(): Expect {
        if (!isTable(this.actual) || this.actual === null || typeof (this.actual as any).then !== 'function') {
            error('expect.rejects: value is not a Promise');
        }
        return new Expect(this.actual, this.negated, 'rejects');
    }

    /**
     * Internal: apply a matcher, handling resolves/rejects modifiers.
     */
    private _applyMatcher(matcher: (actual: unknown) => void): void | Promise<void> {
        if (this.promiseModifier === 'resolves') {
            return (this.actual as Promise<unknown>).then(
                (value: unknown) => {
                    new Expect(value, this.negated, 'none')._applyMatcher(matcher);
                },
                (err: unknown) => {
                    error(`expect.resolves: Promise rejected instead of resolving: ${tostring(err)}`);
                }
            );
        }
        if (this.promiseModifier === 'rejects') {
            return (this.actual as Promise<unknown>).then(
                (_value: unknown) => {
                    error('expect.rejects: Promise resolved instead of rejecting');
                },
                (err: unknown) => {
                    new Expect(err, this.negated, 'none')._applyMatcher(matcher);
                }
            );
        }
        matcher(this.actual);
    }

    // ========================================================================
    // Reference equality
    // ========================================================================

    /** Strict equality (===). In Lua, null === undefined is true. */
    toBe(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            let pass = actual === expected;
            // In Lua, null and undefined are both nil — treat as equal
            if (!pass && (actual === null || actual === undefined) && (expected === null || expected === undefined)) {
                pass = true;
            }
            this._assert(pass, `Expected ${format(actual)} to be ${format(expected)}`, `Expected ${format(actual)} NOT to be ${format(expected)}`);
        });
    }

    /** Deep equality check. Supports asymmetric matchers in expected value. */
    toEqual(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = deepEqual(actual, expected);
            this._assert(
                pass,
                `Expected ${format(actual)} to deeply equal ${format(expected)}`,
                `Expected ${format(actual)} NOT to deeply equal ${format(expected)}`
            );
        });
    }

    /** Strict deep equality. In Lua runtime, equivalent to toEqual. */
    toStrictEqual(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = deepEqual(actual, expected);
            this._assert(
                pass,
                `Expected ${format(actual)} to strictly equal ${format(expected)}`,
                `Expected ${format(actual)} NOT to strictly equal ${format(expected)}`
            );
        });
    }

    // ========================================================================
    // Truthiness — uses Jest semantics (0, "" are falsy)
    // ========================================================================

    toBeTruthy(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = !isFalsy(actual);
            this._assert(pass, `Expected ${format(actual)} to be truthy`, `Expected ${format(actual)} NOT to be truthy`);
        });
    }

    toBeFalsy(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = isFalsy(actual);
            this._assert(pass, `Expected ${format(actual)} to be falsy`, `Expected ${format(actual)} NOT to be falsy`);
        });
    }

    // ========================================================================
    // Null / Undefined — in Lua both are nil
    // ========================================================================

    toBeNull(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = actual === null || actual === undefined;
            this._assert(pass, `Expected ${format(actual)} to be null`, `Expected ${format(actual)} NOT to be null`);
        });
    }

    toBeUndefined(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = actual === undefined || actual === null;
            this._assert(pass, `Expected ${format(actual)} to be undefined`, `Expected ${format(actual)} NOT to be undefined`);
        });
    }

    toBeDefined(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = actual !== undefined && actual !== null;
            this._assert(pass, `Expected value to be defined`, `Expected ${format(actual)} NOT to be defined`);
        });
    }

    toBeNaN(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = actual !== actual; // NaN is the only value not equal to itself
            this._assert(pass, `Expected ${format(actual)} to be NaN`, `Expected ${format(actual)} NOT to be NaN`);
        });
    }

    // ========================================================================
    // Numbers
    // ========================================================================

    toBeGreaterThan(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = (actual as number) > expected;
            this._assert(pass, `Expected ${actual} to be > ${expected}`, `Expected ${actual} NOT to be > ${expected}`);
        });
    }

    toBeGreaterThanOrEqual(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = (actual as number) >= expected;
            this._assert(pass, `Expected ${actual} to be >= ${expected}`, `Expected ${actual} NOT to be >= ${expected}`);
        });
    }

    toBeLessThan(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = (actual as number) < expected;
            this._assert(pass, `Expected ${actual} to be < ${expected}`, `Expected ${actual} NOT to be < ${expected}`);
        });
    }

    toBeLessThanOrEqual(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = (actual as number) <= expected;
            this._assert(pass, `Expected ${actual} to be <= ${expected}`, `Expected ${actual} NOT to be <= ${expected}`);
        });
    }

    toBeCloseTo(expected: number, precision: number = 2): void | Promise<void> {
        return this._applyMatcher(actual => {
            const diff = Math.abs((actual as number) - expected);
            const threshold = Math.pow(10, -precision) / 2;
            const pass = diff < threshold;
            this._assert(
                pass,
                `Expected ${actual} to be close to ${expected} (precision: ${precision}), diff=${diff}`,
                `Expected ${actual} NOT to be close to ${expected}`
            );
        });
    }

    // ========================================================================
    // Strings
    // ========================================================================

    toMatch(pattern: string): void | Promise<void> {
        return this._applyMatcher(actual => {
            const str = actual as string;
            const pass = str.indexOf(pattern) !== -1;
            this._assert(pass, `Expected "${str}" to match pattern "${pattern}"`, `Expected "${str}" NOT to match pattern "${pattern}"`);
        });
    }

    // ========================================================================
    // Arrays / Collections
    // ========================================================================

    toContain(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            if (typeof actual === 'string') {
                const pass = (actual as string).indexOf(expected as string) !== -1;
                this._assert(pass, `Expected "${actual}" to contain "${expected}"`, `Expected "${actual}" NOT to contain "${expected}"`);
            } else {
                const arr = actual as unknown[];
                const pass = arr.some(item => deepEqual(item, expected));
                this._assert(pass, `Expected array to contain ${format(expected)}`, `Expected array NOT to contain ${format(expected)}`);
            }
        });
    }

    toContainEqual(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const arr = actual as unknown[];
            const pass = arr.some(item => deepEqual(item, expected));
            this._assert(
                pass,
                `Expected array to contain a deep-equal item ${format(expected)}`,
                `Expected array NOT to contain a deep-equal item ${format(expected)}`
            );
        });
    }

    toHaveLength(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const len = getLength(actual);
            const pass = len === expected;
            this._assert(pass, `Expected length ${tostring(len)} to be ${expected}`, `Expected length ${tostring(len)} NOT to be ${expected}`);
        });
    }

    // ========================================================================
    // Objects
    // ========================================================================

    toHaveProperty(path: string | string[], value?: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const propVal = getByPath(actual, path);
            const hasProp = propVal !== undefined && propVal !== null;
            if (value !== undefined) {
                const pass = hasProp && deepEqual(propVal, value);
                this._assert(
                    pass,
                    `Expected object to have property "${path}" with value ${format(value)}, got ${format(propVal)}`,
                    `Expected object NOT to have property "${path}" with value ${format(value)}`
                );
            } else {
                this._assert(hasProp, `Expected object to have property "${path}"`, `Expected object NOT to have property "${path}"`);
            }
        });
    }

    toMatchObject(expected: Record<string, unknown>): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = matchObject(actual, expected);
            this._assert(
                pass,
                `Expected ${format(actual)} to match object ${format(expected)}`,
                `Expected ${format(actual)} NOT to match object ${format(expected)}`
            );
        });
    }

    toBeInstanceOf(expected: Function): void | Promise<void> {
        return this._applyMatcher(actual => {
            const pass = actual instanceof (expected as any);
            this._assert(
                pass,
                `Expected ${format(actual)} to be an instance of ${expected.name || 'Function'}`,
                `Expected ${format(actual)} NOT to be an instance of ${expected.name || 'Function'}`
            );
        });
    }

    // ========================================================================
    // Exceptions
    // ========================================================================

    toThrow(expectedMsg?: string): void | Promise<void> {
        if (this.promiseModifier !== 'none') {
            error('toThrow cannot be used with resolves/rejects. Use expect(fn).toThrow() directly.');
        }

        incrementAssertionCount();
        const fn = this.actual as () => void;
        let threw = false;
        let errMsg = '';
        try {
            fn();
        } catch (e) {
            threw = true;
            errMsg = tostring(e);
        }
        if (this.negated) {
            if (threw) {
                error(`Expected function NOT to throw, but it threw: ${errMsg}`);
            }
        } else {
            if (!threw) {
                error('Expected function to throw, but it did not');
            }
            if (expectedMsg !== undefined && errMsg.indexOf(expectedMsg) === -1) {
                error(`Expected error message to contain "${expectedMsg}", got: ${errMsg}`);
            }
        }
    }

    // ========================================================================
    // Mock function matchers
    // ========================================================================

    toHaveBeenCalled(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveBeenCalled: value is not a mock function');
            const pass = mock.calls.length > 0;
            this._assert(pass, `Expected mock to have been called`, `Expected mock NOT to have been called`);
        });
    }

    toHaveBeenCalledTimes(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveBeenCalledTimes: value is not a mock function');
            const pass = mock.calls.length === expected;
            this._assert(
                pass,
                `Expected mock to have been called ${expected} times, but was called ${mock.calls.length} times`,
                `Expected mock NOT to have been called ${expected} times`
            );
        });
    }

    toHaveBeenCalledWith(...args: unknown[]): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveBeenCalledWith: value is not a mock function');
            const pass = mock.calls.some(call => {
                if (call.length !== args.length) return false;
                for (let i = 0; i < args.length; i++) {
                    if (!matchValue(call[i], args[i]) && !deepEqual(call[i], args[i])) return false;
                }
                return true;
            });
            this._assert(
                pass,
                `Expected mock to have been called with ${format(args)}, but calls were: ${format(mock.calls)}`,
                `Expected mock NOT to have been called with ${format(args)}`
            );
        });
    }

    toHaveBeenLastCalledWith(...args: unknown[]): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveBeenLastCalledWith: value is not a mock function');
            if (mock.calls.length === 0) {
                this._assert(false, `Expected mock to have been called (no calls recorded)`, `Expected mock to have no calls`);
                return;
            }
            const lastCall = mock.calls[mock.calls.length - 1];
            const pass = lastCall.length === args.length && lastCall.every((v, i) => matchValue(v, args[i]) || deepEqual(v, args[i]));
            this._assert(
                pass,
                `Expected last call to be ${format(args)}, but was ${format(lastCall)}`,
                `Expected last call NOT to be ${format(args)}`
            );
        });
    }

    toHaveBeenNthCalledWith(nthCall: number, ...args: unknown[]): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveBeenNthCalledWith: value is not a mock function');
            if (nthCall < 1 || nthCall > mock.calls.length) {
                this._assert(false, `Expected call #${nthCall} but only ${mock.calls.length} calls recorded`, '');
                return;
            }
            const call = mock.calls[nthCall - 1];
            const pass = call.length === args.length && call.every((v, i) => matchValue(v, args[i]) || deepEqual(v, args[i]));
            this._assert(
                pass,
                `Expected call #${nthCall} to be ${format(args)}, but was ${format(call)}`,
                `Expected call #${nthCall} NOT to be ${format(args)}`
            );
        });
    }

    toHaveReturned(): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveReturned: value is not a mock function');
            const pass = mock.results.some(r => r.type === 'return');
            this._assert(pass, `Expected mock to have returned`, `Expected mock NOT to have returned`);
        });
    }

    toHaveReturnedTimes(expected: number): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveReturnedTimes: value is not a mock function');
            const returnCount = mock.results.filter(r => r.type === 'return').length;
            const pass = returnCount === expected;
            this._assert(
                pass,
                `Expected mock to have returned ${expected} times, but returned ${returnCount} times`,
                `Expected mock NOT to have returned ${expected} times`
            );
        });
    }

    toHaveReturnedWith(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveReturnedWith: value is not a mock function');
            const pass = mock.results.some(r => r.type === 'return' && deepEqual(r.value, expected));
            this._assert(
                pass,
                `Expected mock to have returned with ${format(expected)}`,
                `Expected mock NOT to have returned with ${format(expected)}`
            );
        });
    }

    toHaveLastReturnedWith(expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveLastReturnedWith: value is not a mock function');
            const returns = mock.results.filter(r => r.type === 'return');
            if (returns.length === 0) {
                this._assert(false, `Expected mock to have returned (no returns recorded)`, '');
                return;
            }
            const lastReturn = returns[returns.length - 1];
            const pass = deepEqual(lastReturn.value, expected);
            this._assert(
                pass,
                `Expected last return to be ${format(expected)}, but was ${format(lastReturn.value)}`,
                `Expected last return NOT to be ${format(expected)}`
            );
        });
    }

    toHaveNthReturnedWith(nthCall: number, expected: unknown): void | Promise<void> {
        return this._applyMatcher(actual => {
            const mock = actual as Mock;
            if (!(mock as any)._state) error('toHaveNthReturnedWith: value is not a mock function');
            const returns = mock.results.filter(r => r.type === 'return');
            if (nthCall < 1 || nthCall > returns.length) {
                this._assert(false, `Expected return #${nthCall} but only ${returns.length} returns recorded`, '');
                return;
            }
            const ret = returns[nthCall - 1];
            const pass = deepEqual(ret.value, expected);
            this._assert(
                pass,
                `Expected return #${nthCall} to be ${format(expected)}, but was ${format(ret.value)}`,
                `Expected return #${nthCall} NOT to be ${format(expected)}`
            );
        });
    }

    // ========================================================================
    // Snapshot matchers — STUBS (no filesystem in Dota 2)
    // ========================================================================

    toMatchSnapshot(_propertyMatchers?: unknown, _hint?: string): void {
        print('[TestFramework] toMatchSnapshot() is not supported — no filesystem in Dota 2 VScript. Use toEqual() instead.');
    }

    toMatchInlineSnapshot(_inlineSnapshot?: string): void {
        print('[TestFramework] toMatchInlineSnapshot() is not supported — no filesystem in Dota 2 VScript. Use toEqual() instead.');
    }

    toThrowErrorMatchingSnapshot(): void {
        print('[TestFramework] toThrowErrorMatchingSnapshot() is not supported — no filesystem in Dota 2 VScript.');
    }

    toThrowErrorMatchingInlineSnapshot(_inlineSnapshot?: string): void {
        print('[TestFramework] toThrowErrorMatchingInlineSnapshot() is not supported — no filesystem in Dota 2 VScript.');
    }
}

// ============================================================================
// Data-driven testing: .each()
// ============================================================================

function formatEachTitle(template: string, data: unknown, index: number): string {
    if (isTable(data) && data !== null && !Array.isArray(data)) {
        let title = template;
        const obj = data as Record<string, unknown>;
        for (const k in obj) {
            title = title.replace(`$${k}`, format(obj[k]));
        }
        title = title.replace('$#', tostring(index));
        return title;
    }

    if (Array.isArray(data)) {
        let title = template;
        let argIdx = 0;
        const placeholders = ['%p', '%s', '%d', '%i', '%f', '%j', '%o'];
        for (const ph of placeholders) {
            while (title.indexOf(ph) !== -1 && argIdx < data.length) {
                title = title.replace(ph, format(data[argIdx]));
                argIdx++;
            }
        }
        title = title.replace('%#', tostring(index));
        title = title.replace('%$', tostring(index + 1));
        title = title.replace('%%', '%');
        return title;
    }

    return template.replace('%p', format(data));
}

function createItEach(isSkip: boolean = false): (table: unknown[][]) => (name: string, fn: (...args: unknown[]) => void | Promise<void>) => void {
    return (table: unknown[][]) => {
        return (name: string, fn: (...args: unknown[]) => void | Promise<void>) => {
            if (!currentSuite) error('it.each() must be called inside describe()');
            for (let i = 0; i < table.length; i++) {
                const data = table[i];
                const args = Array.isArray(data) ? data : [data];
                const title = formatEachTitle(name, data, i);
                currentSuite.cases.push({
                    name: title,
                    fn: () => fn(...args),
                    skip: isSkip,
                    only: false,
                    failing: false,
                    todo: false,
                });
            }
        };
    };
}

function createDescribeEach(isSkip: boolean = false): (table: unknown[][]) => (name: string, fn: (...args: unknown[]) => void) => void {
    return (table: unknown[][]) => {
        return (name: string, fn: (...args: unknown[]) => void) => {
            for (let i = 0; i < table.length; i++) {
                const data = table[i];
                const args = Array.isArray(data) ? data : [data];
                const title = formatEachTitle(name, data, i);
                describe(title, () => fn(...args));
                if (isSkip && suites.length > 0) {
                    suites[suites.length - 1].skip = true;
                }
            }
        };
    };
}

// ============================================================================
// Registration API — describe / it / test / beforeAll / beforeEach / …
// ============================================================================

interface ItFunction {
    (name: string, fn: TestFn): void;
    each: ReturnType<typeof createItEach>;
    only(name: string, fn: TestFn): void;
    skip(name: string, fn: TestFn): void;
    failing(name: string, fn: TestFn): void;
    todo(name: string): void;
    concurrent: ItConcurrentNamespace;
}

interface ItConcurrentNamespace {
    (name: string, fn: TestFn): void;
    each: ReturnType<typeof createItEach>;
    only(name: string, fn: TestFn): void;
    skip(name: string, fn: TestFn): void;
}

interface DescribeFunction {
    (name: string, fn: () => void): void;
    each: ReturnType<typeof createDescribeEach>;
    only(name: string, fn: () => void): void;
    skip(name: string, fn: () => void): void;
}

interface TestFunction {
    (name: string, fn: TestFn): void;
    each: ReturnType<typeof createItEach>;
    only(name: string, fn: TestFn): void;
    skip(name: string, fn: TestFn): void;
    failing(name: string, fn: TestFn): void;
    todo(name: string): void;
    concurrent: ItConcurrentNamespace;
}

// it.concurrent namespace
const concurrentNamespace: ItConcurrentNamespace = function (name: string, fn: TestFn): void {
    print(`[TestFramework] it.concurrent("${name}") — concurrent tests run sequentially in Dota 2 (no thread support)`);
    it(name, fn);
} as ItConcurrentNamespace;

const itFn = function (name: string, fn: TestFn): void {
    if (!currentSuite) error('it() must be called inside describe()');
    currentSuite.cases.push({ name, fn, skip: false, only: false, failing: false, todo: false });
} as ItFunction;

itFn.each = createItEach(false);

itFn.only = (name: string, fn: TestFn): void => {
    if (!currentSuite) error('it.only() must be called inside describe()');
    onlyMode = true;
    currentSuite.cases.push({ name, fn, skip: false, only: true, failing: false, todo: false });
};

itFn.skip = (name: string, _fn: TestFn): void => {
    if (!currentSuite) error('it.skip() must be called inside describe()');
    currentSuite.cases.push({ name, fn: () => {}, skip: true, only: false, failing: false, todo: false });
};

itFn.failing = (name: string, fn: TestFn): void => {
    if (!currentSuite) error('it.failing() must be called inside describe()');
    currentSuite.cases.push({ name, fn, skip: false, only: false, failing: true, todo: false });
};

itFn.todo = (name: string): void => {
    if (!currentSuite) error('it.todo() must be called inside describe()');
    currentSuite.cases.push({ name, fn: () => {}, skip: true, only: false, failing: false, todo: true });
};

concurrentNamespace.each = createItEach(false);
concurrentNamespace.only = itFn.only;
concurrentNamespace.skip = itFn.skip;
itFn.concurrent = concurrentNamespace;

export const it = itFn;

// describe
const describeFn = function (name: string, fn: () => void): void {
    const suite: TestSuite = {
        name,
        cases: [],
        beforeEachFn: null,
        afterEachFn: null,
        beforeAllFn: null,
        afterAllFn: null,
        skip: false,
        only: false,
    };
    const prev = currentSuite;
    currentSuite = suite;
    fn();
    currentSuite = prev;
    suites.push(suite);
} as DescribeFunction;

describeFn.each = createDescribeEach(false);

describeFn.only = (name: string, fn: () => void): void => {
    onlyMode = true;
    const suite: TestSuite = {
        name,
        cases: [],
        beforeEachFn: null,
        afterEachFn: null,
        beforeAllFn: null,
        afterAllFn: null,
        skip: false,
        only: true,
    };
    const prev = currentSuite;
    currentSuite = suite;
    fn();
    currentSuite = prev;
    suites.push(suite);
};

describeFn.skip = (name: string, _fn: () => void): void => {
    const suite: TestSuite = {
        name,
        cases: [],
        beforeEachFn: null,
        afterEachFn: null,
        beforeAllFn: null,
        afterAllFn: null,
        skip: true,
        only: false,
    };
    suites.push(suite);
};

export const describe = describeFn;

/** Mark a suite as skipped. Alias for describe.skip. */
export function xdescribe(name: string, fn: () => void): void {
    describe.skip(name, fn);
}

// test alias
const testFn = function (name: string, fn: TestFn): void {
    it(name, fn);
} as TestFunction;

testFn.each = it.each;
testFn.only = it.only;
testFn.skip = it.skip;
testFn.failing = it.failing;
testFn.todo = it.todo;
testFn.concurrent = it.concurrent;

export const test = testFn;

/** Alias for xit / it.skip */
export function xit(name: string, fn: TestFn): void {
    it.skip(name, fn);
}

/** Alias for fit / it.only */
export function fit(name: string, fn: TestFn): void {
    it.only(name, fn);
}

/** Alias for fdescribe / describe.only */
export function fdescribe(name: string, fn: () => void): void {
    describe.only(name, fn);
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

export function beforeAll(fn: HookFn): void {
    if (!currentSuite) error('beforeAll() must be called inside describe()');
    currentSuite.beforeAllFn = fn;
}

export function afterAll(fn: HookFn): void {
    if (!currentSuite) error('afterAll() must be called inside describe()');
    currentSuite.afterAllFn = fn;
}

export function beforeEach(fn: HookFn): void {
    if (!currentSuite) error('beforeEach() must be called inside describe()');
    currentSuite.beforeEachFn = fn;
}

export function afterEach(fn: HookFn): void {
    if (!currentSuite) error('afterEach() must be called inside describe()');
    currentSuite.afterEachFn = fn;
}

// ============================================================================
// Utilities
// ============================================================================

/** Promise-based delay — uses Timers.CreateTimer under the hood. */
export function delay(seconds: number): Promise<void> {
    return new Promise<void>(resolve => {
        Timers.CreateTimer(seconds, () => {
            resolve();
            return null;
        });
    });
}

// ============================================================================
// Runner
// ============================================================================

export interface TestRunResult {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    duration: number;
    errors: { suite: string; test: string; message: string }[];
}

export function runAll(filter?: string): Promise<TestRunResult> {
    const result: TestRunResult = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 0,
        errors: [],
    };
    const t0 = Time();

    let matched = filter ? suites.filter(s => s.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1) : suites;

    if (onlyMode) {
        matched = matched.filter(s => s.only || s.cases.some(tc => tc.only));
    }

    let chain: Promise<void> = Promise.resolve();
    for (const suite of matched) {
        chain = chain.then(() => runSuite(suite, result, onlyMode));
    }

    return chain.then(() => {
        result.duration = Time() - t0;
        return result;
    });
}

/** Clear all registered suites (useful for hot-reload). */
export function clearSuites(): void {
    suites = [];
    currentSuite = null;
    onlyMode = false;
}

async function runSuite(suite: TestSuite, result: TestRunResult, onlyModeActive: boolean): Promise<void> {
    const indent = '  ';
    const suiteLabel = suite.skip ? `${suite.name} (skipped)` : suite.name;
    print(`${indent}▸ ${suiteLabel}`);

    if (suite.skip) {
        result.skipped += suite.cases.length;
        result.total += suite.cases.length;
        return;
    }

    // beforeAll
    if (suite.beforeAllFn) {
        const [ok, err] = pcall(() => suite.beforeAllFn!());
        if (!ok) {
            print(`${indent}${indent}✗ beforeAll failed: ${tostring(err)}`);
            result.failed += suite.cases.length;
            result.total += suite.cases.length;
            result.errors.push({ suite: suite.name, test: 'beforeAll', message: tostring(err) });
            return;
        }
    }

    for (const tc of suite.cases) {
        result.total++;

        if (onlyModeActive && !tc.only) {
            result.skipped++;
            print(`${indent}${indent}○ ${tc.name} — skipped (onlyMode)`);
            continue;
        }

        if (tc.todo) {
            result.todo++;
            result.skipped++;
            print(`${indent}${indent}⏳ ${tc.name} — TODO`);
            continue;
        }

        if (tc.skip) {
            result.skipped++;
            print(`${indent}${indent}○ ${tc.name} — skipped`);
            continue;
        }

        // beforeEach
        if (suite.beforeEachFn) {
            const [hookOk, hookErr] = pcall(() => suite.beforeEachFn!());
            if (!hookOk) {
                result.failed++;
                result.errors.push({ suite: suite.name, test: tc.name, message: `beforeEach: ${tostring(hookErr)}` });
                print(`${indent}${indent}✗ ${tc.name} — beforeEach failed: ${tostring(hookErr)}`);
                continue;
            }
        }

        // Reset assertion tracking
        _assertionCount = 0;
        _assertionTarget = 0;

        // Run the test
        const [ok, err] = pcall(() => tc.fn());
        let testPassed: boolean;

        if (ok) {
            if (err !== undefined && isTable(err) && typeof (err as any).then === 'function') {
                const resolved = await safeResolve(err as Promise<void>);
                if (resolved.ok) {
                    testPassed = true;
                } else {
                    testPassed = false;
                    result.errors.push({ suite: suite.name, test: tc.name, message: resolved.err! });
                }
            } else {
                testPassed = true;
            }
        } else {
            testPassed = false;
            result.errors.push({ suite: suite.name, test: tc.name, message: tostring(err) });
        }

        if (testPassed) {
            const assertErr = checkAssertionCount();
            if (assertErr) {
                testPassed = false;
                result.errors.push({ suite: suite.name, test: tc.name, message: assertErr });
            }
        }

        if (tc.failing) {
            testPassed = !testPassed;
            // If a failing test passes (error inverted to success), remove the error from the list
            if (testPassed && result.errors.length > 0) {
                result.errors.pop();
            }
            // If a failing test unexpectedly passes (no error thrown), record the reason
            if (!testPassed && !result.errors.some(e => e.test === tc.name && e.suite === suite.name)) {
                result.errors.push({
                    suite: suite.name,
                    test: tc.name,
                    message: 'Expected test to fail (throw), but it passed',
                });
            }
        }

        if (testPassed) {
            result.passed++;
            print(`${indent}${indent}✓ ${tc.name}${tc.failing ? ' (failing)' : ''}`);
        } else {
            result.failed++;
            print(
                `${indent}${indent}✗ ${tc.name}${tc.failing ? ' (expected to fail)' : ''} — ${
                    result.errors[result.errors.length - 1]?.message || 'unknown error'
                }`
            );
        }

        // afterEach
        if (suite.afterEachFn) {
            const [hookOk, hookErr] = pcall(() => suite.afterEachFn!());
            if (!hookOk) {
                print(`${indent}${indent}  ⚠ afterEach failed: ${tostring(hookErr)}`);
            }
        }
    }

    // afterAll
    if (suite.afterAllFn) {
        const [ok, err] = pcall(() => suite.afterAllFn!());
        if (!ok) {
            print(`${indent}${indent}⚠ afterAll failed: ${tostring(err)}`);
        }
    }
}

function safeResolve(p: Promise<void>): Promise<{ ok: boolean; err?: string }> {
    return new Promise(resolve => {
        p.then(
            () => resolve({ ok: true }),
            (e: unknown) => resolve({ ok: false, err: tostring(e) })
        );
    });
}

// ============================================================================
// Reporter
// ============================================================================

export function printResult(result: TestRunResult): void {
    const bar = '══════════════════════════════════════════════════';
    print(bar);
    if (result.failed === 0) {
        print(`  All tests passed! ${result.passed}/${result.total}`);
    } else {
        print(`  Tests: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped, ${result.total} total`);
    }
    if (result.todo > 0) {
        print(`  TODO: ${result.todo} test(s) pending`);
    }
    print(`  Duration: ${result.duration.toFixed(2)}s`);

    if (result.errors.length > 0) {
        print('');
        print('  Failed tests:');
        for (const e of result.errors) {
            print(`    ✗ ${e.suite} > ${e.test}`);
            print(`      ${e.message}`);
        }
    }
    print(bar);
}

// ============================================================================
// Chat Command Integration
// ============================================================================

let listenerRegistered = false;

/**
 * Register the `-tx` chat command.
 * Call once at startup (safe to call multiple times — guards against duplicate registration).
 */
export function registerTestCommand(): void {
    if (listenerRegistered) return;
    if (!IsServer()) return;
    listenerRegistered = true;

    ListenToGameEvent(
        'player_chat',
        (keys: GameEventProvidedProperties & PlayerChatEvent) => {
            if (!IsInToolsMode()) return;
            const text = keys.text;
            const parts = text.split(' ');
            if (parts[0].toLowerCase() !== '-tx') return;

            const filter = parts[1];
            print(`\n[Test] Running${filter ? ` suites matching "${filter}"` : ' all suites'}…\n`);

            runAll(filter).then(result => {
                printResult(result);
            });
        },
        undefined
    );
}

// Re-export expect with its namespace merged
export { expect };
