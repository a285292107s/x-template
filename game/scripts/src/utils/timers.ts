/**
 * Timer library for Dota 2 custom games.
 *
 * Uses a flat array with lazy cleanup — O(1) insert/cancel, O(n) per tick scan.
 * For the 10–100 timers typical in a custom game, this is simpler and faster
 * than a binary heap (no sift overhead, no heapIndex bookkeeping).
 *
 * Globally available as `Timers.CreateTimer(...)` after import.
 *
 * @example
 * ```ts
 * // Fire after 1 frame
 * Timers.CreateTimer(() => print('next frame'));
 *
 * // Fire after 2 seconds, repeat every 1 second
 * Timers.CreateTimer(2, () => { print('tick'); return 1; });
 *
 * // Full options
 * const h = Timers.CreateTimer({ delay: 5, useGameTime: false, callback: () => {} });
 * h.cancel();
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface TimerHandle {
    cancel(): void;
    readonly active: boolean;
    readonly name: string;
}

export interface CreateTimerOptions {
    callback: (this: void) => void | number;
    delay?: number;
    useGameTime?: boolean;
}

// ============================================================================
// Entry & Handle
// ============================================================================

interface TimerEntry {
    endTime: number;
    callback: (this: void) => void | number;
    name: string;
    cancelled: boolean;
}

class TimerHandleImpl implements TimerHandle {
    readonly _entry: TimerEntry;

    constructor(entry: TimerEntry) {
        this._entry = entry;
    }

    get active(): boolean {
        return !this._entry.cancelled;
    }

    get name(): string {
        return this._entry.name;
    }

    cancel(): void {
        const entry = this._entry;
        if (entry.cancelled) return;
        if (entry === runningTimer) shouldRemoveRunning = true;
        entry.cancelled = true;
    }
}

// ============================================================================
// State
// ============================================================================

const THINK_INTERVAL = 0.01;
const POST_GAME = GameState.POST_GAME;

let gameTimers: TimerEntry[] = [];
let realTimers: TimerEntry[] = [];
let nextFrameCallbacks: Array<() => void> = [];
let runningTimer: TimerEntry | null = null;
let shouldRemoveRunning = false;
let initialized = false;

// ============================================================================
// Core
// ============================================================================

function processTimers(timers: TimerEntry[], now: number): TimerEntry[] {
    const alive: TimerEntry[] = [];
    for (const entry of timers) {
        if (entry.cancelled) continue;
        if (now < entry.endTime) {
            alive.push(entry);
            continue;
        }

        runningTimer = entry;
        shouldRemoveRunning = false;

        const [ok, result] = pcall(() => entry.callback());
        if (ok) {
            const removeSelf = shouldRemoveRunning;
            runningTimer = null;

            if (removeSelf) continue;
            if (result !== undefined && result !== null) {
                entry.endTime = entry.endTime + (result as number);
                alive.push(entry);
            }
        } else {
            if (IsInToolsMode()) print(tostring(result));
            runningTimer = null;
        }
    }
    return alive;
}

function think(): number {
    if (nextFrameCallbacks.length > 0) {
        const pending = nextFrameCallbacks;
        nextFrameCallbacks = [];
        for (const cb of pending) {
            const [ok, err] = pcall(() => cb());
            if (!ok && IsInToolsMode()) print(tostring(err));
        }
    }

    if (GameRules.State_Get() > POST_GAME) return THINK_INTERVAL;

    // Snapshot arrays before processing — callbacks may ClearAll + CreateTimer,
    // replacing gameTimers/realTimers with new arrays whose entries we must keep.
    const oldGameTimers = gameTimers;
    const oldRealTimers = realTimers;

    const gameAlive = processTimers(oldGameTimers, GameRules.GetGameTime());
    const realAlive = processTimers(oldRealTimers, Time());

    // If callbacks replaced the arrays, merge in any new entries they created.
    if (gameTimers !== oldGameTimers) {
        for (const e of gameTimers) {
            if (!e.cancelled) gameAlive.push(e);
        }
    }
    if (realTimers !== oldRealTimers) {
        for (const e of realTimers) {
            if (!e.cancelled) realAlive.push(e);
        }
    }

    gameTimers = gameAlive;
    realTimers = realAlive;

    return THINK_INTERVAL;
}

// ============================================================================
// Init
// ============================================================================

function ensureInit(): void {
    if (initialized) return;
    if (!IsServer()) { initialized = true; return; }
    initialized = true;

    const ent = SpawnEntityFromTableSynchronous("info_target", { targetname: "timers_thinker" });
    ent.SetThink(think, undefined!, "timers", THINK_INTERVAL);
}

// ============================================================================
// Public API
// ============================================================================

let seq = 0;

export function CreateTimer(callback: (this: void) => void | number): TimerHandle;
export function CreateTimer(delay: number, callback: (this: void) => void | number): TimerHandle;
export function CreateTimer(options: CreateTimerOptions): TimerHandle;
export function CreateTimer(
    arg1: number | CreateTimerOptions | ((this: void) => void | number),
    arg2?: (this: void) => void | number
): TimerHandle {
    ensureInit();

    let callback: (this: void) => void | number;
    let delay = 0;
    let useGameTime = true;

    if (typeof arg1 === "function") {
        callback = arg1;
    } else if (typeof arg1 === "number") {
        delay = arg1;
        callback = arg2!;
    } else {
        callback = arg1.callback;
        if (arg1.delay !== undefined) delay = arg1.delay;
        if (arg1.useGameTime !== undefined) useGameTime = arg1.useGameTime;
    }

    if (!callback) error("CreateTimer: callback is required");

    const now = useGameTime ? GameRules.GetGameTime() : Time();
    seq++;
    const entry: TimerEntry = {
        endTime: now + delay,
        callback,
        name: `timer_${seq}`,
        cancelled: false,
    };

    (useGameTime ? gameTimers : realTimers).push(entry);
    return new TimerHandleImpl(entry);
}

export function NextFrame(callback: () => void): void {
    ensureInit();
    nextFrameCallbacks.push(callback);
}

function RemoveTimer(handle: TimerHandle): void {
    handle.cancel();
}

export function ClearAll(): void {
    gameTimers = [];
    realTimers = [];
    nextFrameCallbacks = [];
    runningTimer = null;
    shouldRemoveRunning = false;
}

// ============================================================================
// Global
// ============================================================================

const TimersGlobal = { CreateTimer, NextFrame, RemoveTimer, ClearAll };
globalThis.Timers = TimersGlobal;
if (IsServer()) GameRules.Timers = TimersGlobal;

declare global {
    var Timers: {
        CreateTimer: typeof CreateTimer;
        NextFrame: typeof NextFrame;
        RemoveTimer: (handle: TimerHandle) => void;
        ClearAll: typeof ClearAll;
    };
    interface CDOTAGameRules {
        Timers: typeof TimersGlobal;
    }
}
