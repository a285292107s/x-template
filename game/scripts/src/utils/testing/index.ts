/**
 * Dota 2 Custom Game Test Framework
 *
 * @example
 * ```ts
 * import { describe, it, expect, beforeEach, delay, jest_fn } from '../utils/testing';
 * ```
 */
export {
    // Registration
    describe,
    xdescribe,
    fdescribe,
    it,
    xit,
    fit,
    test,

    // Lifecycle
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,

    // Assertions
    expect,
    Expect,

    // Mocks
    jest_fn,
    spyOn,
    restoreSpy,

    // Utilities
    delay,
    runAll,
    clearSuites,
    registerTestCommand,
    printResult,
} from './test_framework';

export type { TestRunResult, Mock } from './test_framework';

// Import tests so they register their suites.
// Remove this line in production or replace with your own test imports.
import './example_test';
import './timer_test';
