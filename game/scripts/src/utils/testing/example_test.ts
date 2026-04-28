/**
 * Example test suite — demonstrates the testing framework API.
 *
 * Run via chat:  -test            (all suites)
 *                -test Example     (this suite only)
 *
 * NOTE: In Lua (Dota 2 VScript), some JavaScript semantics differ:
 * - null and undefined are both nil (no distinction at runtime)
 * - 0 and "" are truthy in Lua, but the framework treats them as falsy (Jest compat)
 */
import {
    describe,
    it,
    test,
    xit,
    xdescribe,
    fit,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    expect,
    jest_fn,
    spyOn,
    restoreSpy,
    delay,
} from './test_framework';

// ============================================================================
// Synchronous tests
// ============================================================================

describe('Example — Math', () => {
    it('should add numbers', () => {
        expect(1 + 1).toBe(2);
    });

    it('should compare numbers', () => {
        expect(10).toBeGreaterThan(5);
        expect(5).toBeLessThanOrEqual(5);
        expect(3).toBeGreaterThanOrEqual(3);
        expect(2).toBeLessThan(3);
    });

    it('should check closeness for floating point', () => {
        expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
    });

    it('should check NaN', () => {
        expect(0 / 0).toBeNaN();
        expect(42).not.toBeNaN();
    });
});

// ============================================================================
// Truthy / Falsy / Null / Undefined
// ============================================================================

describe('Example — Truthiness', () => {
    it('should be truthy', () => {
        expect(1).toBeTruthy();
        expect('hello').toBeTruthy();
        expect({}).toBeTruthy();
    });

    it('should be falsy', () => {
        // Framework treats 0, "", null, undefined as falsy (Jest semantics)
        expect(0).toBeFalsy();
        expect('').toBeFalsy();
        expect(null).toBeFalsy();
        expect(undefined).toBeFalsy();
    });

    it('should handle null and undefined', () => {
        // In Lua, null and undefined are both nil — toBeNull and toBeUndefined
        // both match nil values
        expect(null).toBeNull();
        expect(undefined).toBeUndefined();
        // Non-nil values are "defined"
        expect('something').toBeDefined();
        // Note: In Lua, null is also nil, so null IS considered "undefined" too.
        // This differs from JS but is a Lua runtime limitation.
    });
});

// ============================================================================
// Collections
// ============================================================================

describe('Example — Collections', () => {
    it('should check array contents', () => {
        const arr = [1, 2, 3];
        expect(arr).toContain(2);
        expect(arr).toHaveLength(3);
        expect(arr).not.toContain(5);
    });

    it('should check string contains', () => {
        expect('hello world').toMatch('world');
        expect('hello world').toContain('hello');
    });

    it('should check deep equality in arrays', () => {
        expect([{ a: 1 }]).toContainEqual({ a: 1 });
    });
});

// ============================================================================
// Objects
// ============================================================================

describe('Example — Objects', () => {
    it('should check deep equality', () => {
        expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
    });

    it('should check strict deep equality', () => {
        expect({ a: 1 }).toStrictEqual({ a: 1 });
    });

    it('should check property existence', () => {
        const obj = { name: 'test', nested: { value: 42 } };
        expect(obj).toHaveProperty('name');
        expect(obj).toHaveProperty('name', 'test');
        expect(obj).toHaveProperty('nested.value', 42);
    });

    it('should match object subset', () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(obj).toMatchObject({ a: 1, c: 3 });
    });

    it('should check instance', () => {
        class MyClass {}
        const instance = new MyClass();
        expect(instance).toBeInstanceOf(MyClass);
    });
});

// ============================================================================
// beforeEach / afterEach
// ============================================================================

describe('Example — Lifecycle Hooks', () => {
    let counter = 0;

    beforeAll(() => {
        print('  [beforeAll] Suite starting');
    });

    afterAll(() => {
        print('  [afterAll] Suite finished');
    });

    beforeEach(() => {
        counter = 10;
    });

    afterEach(() => {
        counter = 0;
    });

    it('should have counter set by beforeEach', () => {
        expect(counter).toBe(10);
    });

    it('should still have counter set by beforeEach (isolated)', () => {
        counter += 5;
        expect(counter).toBe(15);
    });
});

// ============================================================================
// Async tests
// ============================================================================

describe('Example — Async', () => {
    it('should wait for a timer', async () => {
        let fired = false;
        Timers.CreateTimer(0.1, () => {
            fired = true;
            return null;
        });
        await delay(0.2);
        expect(fired).toBeTruthy();
    });

    it('should handle multiple async steps', async () => {
        let step1 = false;
        let step2 = false;

        Timers.CreateTimer(0.05, () => {
            step1 = true;
            return null;
        });
        await delay(0.1);
        expect(step1).toBeTruthy();

        Timers.CreateTimer(0.05, () => {
            step2 = true;
            return null;
        });
        await delay(0.1);
        expect(step2).toBeTruthy();
    });

    it('should support expect.resolves', async () => {
        const p = delay(0.05).then(() => 'done');
        await expect(p).resolves.toBe('done');
    });

    it('should support expect.rejects', async () => {
        const p = new Promise<void>((_, reject) => {
            Timers.CreateTimer(0.05, () => {
                reject('fail!');
                return null;
            });
        });
        await expect(p).rejects.toBe('fail!');
    });
});

// ============================================================================
// Error handling
// ============================================================================

describe('Example — Errors', () => {
    it('should catch thrown errors', () => {
        expect(() => error('boom')).toThrow('boom');
    });

    it('should catch any thrown error', () => {
        expect(() => error('something')).toThrow();
    });

    it('should assert NOT to throw', () => {
        expect(() => {}).not.toThrow();
    });
});

// ============================================================================
// Negation with .not
// ============================================================================

describe('Example — Negation', () => {
    it('should use .not matcher', () => {
        expect(1).not.toBe(2);
        expect(true).not.toBeFalsy();
        expect([1, 2, 3]).not.toContain(4);
        // Note: In Lua null=undefined=nil, so "not toBeUndefined" with a
        // non-null value is the reliable pattern
        expect('hello').not.toBeUndefined();
    });
});

// ============================================================================
// Mock functions (jest_fn)
// ============================================================================

describe('Example — Mocks', () => {
    it('should track calls', () => {
        const fn = jest_fn();
        fn(1, 2);
        fn('a');
        expect(fn.calls).toHaveLength(2);
        expect(fn.calls[0]).toEqual([1, 2]);
    });

    it('should track call count', () => {
        const fn = jest_fn();
        fn();
        fn();
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should check called with', () => {
        const fn = jest_fn();
        fn(1, 2);
        fn(3, 4);
        expect(fn).toHaveBeenCalledWith(1, 2);
        expect(fn).toHaveBeenLastCalledWith(3, 4);
        expect(fn).toHaveBeenNthCalledWith(1, 1, 2);
    });

    it('should track return values', () => {
        const fn = jest_fn((x: number) => x * 2);
        fn(3);
        fn(5);
        expect(fn).toHaveReturned();
        expect(fn).toHaveReturnedTimes(2);
        expect(fn).toHaveReturnedWith(6);
        expect(fn).toHaveLastReturnedWith(10);
        expect(fn).toHaveNthReturnedWith(1, 6);
    });

    it('should support mockReturnValue', () => {
        const fn = jest_fn();
        fn.mockReturnValue(42);
        expect(fn()).toBe(42);
        expect(fn()).toBe(42);
    });

    it('should support mockReturnValueOnce', () => {
        const fn = jest_fn();
        fn.mockReturnValueOnce(1);
        fn.mockReturnValueOnce(2);
        fn.mockReturnValue(99);
        expect(fn()).toBe(1);
        expect(fn()).toBe(2);
        expect(fn()).toBe(99);
        expect(fn()).toBe(99);
    });

    it('should support mockImplementation', () => {
        const fn = jest_fn();
        fn.mockImplementation((x: number) => x + 10);
        expect(fn(5)).toBe(15);
    });

    it('should support mockClear / mockReset', () => {
        const fn = jest_fn((x: number) => x);
        fn(1);
        expect(fn).toHaveBeenCalledTimes(1);
        fn.mockClear();
        expect(fn).toHaveBeenCalledTimes(0);
        // mockClear preserves implementation
        expect(fn(2)).toBe(2);

        fn.mockReset();
        // mockReset removes implementation
        expect(fn(3)).toBe(undefined);
    });
});

// ============================================================================
// spyOn
// ============================================================================

describe('Example — Spy', () => {
    it('should spy on object method', () => {
        const obj = {
            greet(name: string): string {
                return `Hello, ${name}!`;
            },
        };

        const spy = spyOn(obj, 'greet');
        const result = obj.greet('World');

        expect(result).toBe('Hello, World!');
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith('World');

        restoreSpy(spy);
        // After restore, original is back
        expect(obj.greet('Test')).toBe('Hello, Test!');
    });
});

// ============================================================================
// Asymmetric matchers
// ============================================================================

describe('Example — Asymmetric Matchers', () => {
    it('should use expect.any()', () => {
        expect(42).toEqual(expect.any(Number));
        expect('hi').toEqual(expect.any(String));
        expect(expect.anything()).toEqual(expect.anything());
    });

    it('should use expect.objectContaining()', () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(obj).toEqual(expect.objectContaining({ a: 1 }));
    });

    it('should use expect.arrayContaining()', () => {
        expect([1, 2, 3, 4]).toEqual(expect.arrayContaining([2, 3]));
    });

    it('should use expect.stringContaining()', () => {
        expect('hello world').toEqual(expect.stringContaining('hello'));
    });

    it('should use expect.stringMatching()', () => {
        expect('hello world').toEqual(expect.stringMatching('world'));
    });

    it('should use expect.closeTo()', () => {
        expect(0.1 + 0.2).toEqual(expect.closeTo(0.3, 5));
    });
});

// ============================================================================
// Data-driven: it.each
// ============================================================================

describe('Example — Data-Driven', () => {
    it.each([
        [1, 2, 3],
        [2, 3, 5],
        [10, 20, 30],
    ])('add %p + %p = %p', (a, b, expected) => {
        expect((a as number) + (b as number)).toBe(expected);
    });
});

// ============================================================================
// Skip / Todo / Failing
// ============================================================================

describe('Example — Skip & Todo', () => {
    xit('this test is skipped', () => {
        expect(true).toBe(false); // won't run
    });

    it.todo('implement this feature later');

    it.failing('this test is expected to fail', () => {
        expect(1).toBe(2); // fails, but marked as PASS because .failing
    });
});

// ============================================================================
// test() alias
// ============================================================================

describe('Example — test alias', () => {
    test('test() works like it()', () => {
        expect(true).toBeTruthy();
    });

    test.skip('test.skip works', () => {
        expect(true).toBe(false);
    });
});
