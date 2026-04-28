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
 * Timers.CreateTimer(() => print('next tick'));
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

// Dota 2 引擎硬限制 Entity:SetThink() 最大频率为 30fps (~0.033s)。
// 此处写 0.01 仅保证 thinker 在每一引擎帧都被调度到（不会被引擎截断），
// 实际触发频率仍为 ~0.033s。
const THINK_INTERVAL = 0.01;
const POST_GAME = GameState.POST_GAME;

let gameTimers: TimerEntry[] = [];
let realTimers: TimerEntry[] = [];
let nextTickCallbacks: Array<() => void> = [];
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
            else {
                // 生产环境打印报错没有意义
                // If you need to collect error info, send an HTTP request here
            }
            runningTimer = null;
        }
    }
    return alive;
}

function think(): number | void {
    if (GameRules.State_Get() > POST_GAME) return;

    if (nextTickCallbacks.length > 0) {
        const pending = nextTickCallbacks;
        nextTickCallbacks = [];
        for (const cb of pending) {
            const [ok, err] = pcall(() => cb());
            if (!ok && IsInToolsMode()) print(tostring(err));
        }
    }

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
    if (!IsServer()) {
        initialized = true;
        return;
    }
    initialized = true;

    const ent = SpawnEntityFromTableSynchronous('info_target', { targetname: 'timers_thinker' });
    ent.SetThink(think as any, undefined!, 'timers', THINK_INTERVAL);
}

// ============================================================================
// Public API
// ============================================================================

let seq = 0;

export function CreateTimer(callback: (this: void) => void | number): TimerHandle;
export function CreateTimer(delay: number, callback: (this: void) => void | number): TimerHandle;
export function CreateTimer(options: CreateTimerOptions): TimerHandle;
export function CreateTimer(arg1: number | CreateTimerOptions | ((this: void) => void | number), arg2?: (this: void) => void | number): TimerHandle {
    ensureInit();

    let callback: (this: void) => void | number;
    let delay = 0;
    let useGameTime = true;

    if (typeof arg1 === 'function') {
        callback = arg1;
    } else if (typeof arg1 === 'number') {
        delay = arg1;
        callback = arg2!;
    } else {
        callback = arg1.callback;
        if (arg1.delay !== undefined) delay = arg1.delay;
        if (arg1.useGameTime !== undefined) useGameTime = arg1.useGameTime;
    }

    if (!callback) error('CreateTimer: callback is required');

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

export function NextTick(callback: () => void): void {
    ensureInit();
    nextTickCallbacks.push(callback);
}

function RemoveTimer(handle: TimerHandle): void {
    handle.cancel();
}

/**
 * Clear all timers.
 *
 * WARNING / 注意:
 * Calling this inside a timer callback will NOT fully clear pending timers —
 * the `think()` loop snapshots the array before processing, so surviving
 * (non-cancelled, not-yet-fired) entries will be re-assigned back.
 *
 * 在定时器回调中调用此方法无法完全清除所有定时器——
 * `think()` 循环在处理前会快照数组，因此未取消、未触发的条目会被重新赋值回去。
 *
 * This method is generally NOT recommended. Prefer cancelling specific handles.
 * 一般不推荐使用此方法，建议优先取消具体的 TimerHandle。
 */
export function ClearAll(): void {
    print('[Timers] ClearAll() — 危险操作！此方法通常不推荐使用，它会清除所有定时器。');
    print('[Timers] 建议优先通过 TimerHandle.cancel() 取消具体的定时器。');
    gameTimers = [];
    realTimers = [];
    nextTickCallbacks = [];
    runningTimer = null;
    shouldRemoveRunning = false;
}

// ============================================================================
// Global
// ============================================================================

const TimersGlobal = { CreateTimer, NextTick, RemoveTimer, ClearAll };
globalThis.Timers = TimersGlobal;
if (IsServer()) GameRules.Timers = TimersGlobal;

declare global {
    var Timers: {
        CreateTimer: typeof CreateTimer;
        NextTick: typeof NextTick;
        RemoveTimer: (handle: TimerHandle) => void;
        ClearAll: typeof ClearAll;
    };
    interface CDOTAGameRules {
        Timers: typeof TimersGlobal;
    }
}
