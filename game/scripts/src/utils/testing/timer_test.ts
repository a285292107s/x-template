import {
    describe,
    it,
    expect,
    delay,
} from './test_framework';

describe('Timers — Basic', () => {
    it('should fire a basic delayed timer once', async () => {
        let fired = false;
        Timers.CreateTimer(0.05, () => {
            fired = true;
        });
        await delay(0.1);
        expect(fired).toBe(true);
    });

    it('should fire a zero-delay timer on next tick', async () => {
        let fired = false;
        Timers.CreateTimer(() => {
            fired = true;
        });
        await delay(0.05);
        expect(fired).toBe(true);
    });

    it('should NOT fire a timer before its delay', async () => {
        let fired = false;
        Timers.CreateTimer(0.5, () => {
            fired = true;
        });
        await delay(0.1);
        expect(fired).toBe(false);
        await delay(0.45);
        expect(fired).toBe(true);
    });
});

describe('Timers — Repeating', () => {
    it('should repeat when callback returns a number', async () => {
        let count = 0;
        Timers.CreateTimer(0.05, () => {
            count++;
            return 0.05;
        });
        await delay(0.2);
        expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should stop repeating when callback returns undefined', async () => {
        let count = 0;
        Timers.CreateTimer(0.05, () => {
            count++;
            if (count >= 3) return undefined;
            return 0.05;
        });
        await delay(0.3);
        expect(count).toBe(3);
    });

    it('should stop repeating when callback returns null', async () => {
        let count = 0;
        Timers.CreateTimer(0.05, () => {
            count++;
            if (count >= 2) return null;
            return 0.05;
        });
        await delay(0.3);
        expect(count).toBe(2);
    });

    it('should handle rapid repeating timer', async () => {
        let count = 0;
        Timers.CreateTimer(0.03, () => {
            count++;
            if (count >= 10) return undefined;
            return 0.03;
        });
        await delay(0.4);
        expect(count).toBe(10);
    });
});

describe('Timers — NextTick', () => {
    it('should fire NextTick callback', async () => {
        let fired = false;
        Timers.NextTick(() => {
            fired = true;
        });
        await delay(0.05);
        expect(fired).toBe(true);
    });

    it('should fire in FIFO order among NextTick callbacks', async () => {
        const order: number[] = [];
        Timers.NextTick(() => { order.push(1); });
        Timers.NextTick(() => { order.push(2); });
        Timers.NextTick(() => { order.push(3); });
        await delay(0.05);
        expect(order).toEqual([1, 2, 3]);
    });

    it('should schedule more NextTick from within NextTick', async () => {
        const order: number[] = [];
        Timers.NextTick(() => {
            order.push(1);
            Timers.NextTick(() => {
                order.push(3);
            });
            order.push(2);
        });
        await delay(0.05);
        expect(order[0]).toBe(1);
        expect(order[1]).toBe(2);
        await delay(0.05);
        expect(order[2]).toBe(3);
    });

    it('should process NextTick before timers in the next think tick', async () => {
        const order: string[] = [];
        Timers.NextTick(() => {
            order.push('nextTick');
        });
        Timers.CreateTimer(0.05, () => {
            order.push('timer');
        });
        await delay(0.15);
        // NextTick fired on next tick (~0.033s), timer at ~0.05s
        expect(order[0]).toBe('nextTick');
    });
});

describe('Timers — Options API', () => {
    it('should work with options object (delay)', async () => {
        let fired = false;
        Timers.CreateTimer({ delay: 0.05, callback: () => { fired = true; } });
        await delay(0.1);
        expect(fired).toBe(true);
    });

    it('should work with options object (zero delay)', async () => {
        let fired = false;
        Timers.CreateTimer({ delay: 0, callback: () => { fired = true; } });
        await delay(0.05);
        expect(fired).toBe(true);
    });

    it('should support useGameTime: false', async () => {
        let fired = false;
        Timers.CreateTimer({ delay: 0.05, useGameTime: false, callback: () => { fired = true; } });
        await delay(0.1);
        expect(fired).toBe(true);
    });
});

describe('Timers — Cancellation', () => {
    it('should cancel a pending timer via handle', async () => {
        let fired = false;
        const handle = Timers.CreateTimer(0.1, () => {
            fired = true;
        });
        handle.cancel();
        await delay(0.2);
        expect(fired).toBe(false);
    });

    it('should cancel a repeating timer', async () => {
        let count = 0;
        const handle = Timers.CreateTimer(0.05, () => {
            count++;
            return 0.05;
        });
        await delay(0.12);
        handle.cancel();
        const snapshot = count;
        await delay(0.2);
        expect(count).toBe(snapshot);
    });

    it('should not fire after handle.cancel() in callback', async () => {
        let count = 0;
        let handle: { cancel: () => void; readonly active: boolean; readonly name: string };
        handle = Timers.CreateTimer(0.05, () => {
            count++;
            handle.cancel();
            return 0.05;
        });
        await delay(0.2);
        expect(count).toBe(1);
    });

    it('should report active = false after cancel', async () => {
        const handle = Timers.CreateTimer(0.1, () => {});
        expect(handle.active).toBe(true);
        handle.cancel();
        expect(handle.active).toBe(false);
    });

    it('should cancel safely after timer already fired', async () => {
        const handle = Timers.CreateTimer(0.03, () => {});
        await delay(0.1);
        handle.cancel();
        expect(true).toBe(true);
    });

    it('should cancel safely multiple times', async () => {
        const handle = Timers.CreateTimer(0.1, () => {});
        handle.cancel();
        handle.cancel();
        handle.cancel();
        expect(handle.active).toBe(false);
    });
});

describe('Timers — Handle Name', () => {
    it('should have a non-empty name', async () => {
        const handle = Timers.CreateTimer(0.1, () => {});
        expect(handle.name).toBeTruthy();
        expect(handle.name).toMatch('timer_');
    });

    it('should have sequential names', async () => {
        const a = Timers.CreateTimer(0.1, () => {});
        const b = Timers.CreateTimer(0.1, () => {});
        expect(a.name).not.toBe(b.name);
    });
});

describe('Timers — Multiple Timers', () => {
    it('should fire multiple timers concurrently', async () => {
        let a = false, b = false, c = false;
        Timers.CreateTimer(0.05, () => { a = true; });
        Timers.CreateTimer(0.05, () => { b = true; });
        Timers.CreateTimer(0.05, () => { c = true; });
        await delay(0.1);
        expect(a).toBe(true);
        expect(b).toBe(true);
        expect(c).toBe(true);
    });

    it('should fire in order of delay', async () => {
        const order: number[] = [];
        Timers.CreateTimer(0.1, () => { order.push(3); });
        Timers.CreateTimer(0.03, () => { order.push(1); });
        Timers.CreateTimer(0.06, () => { order.push(2); });
        await delay(0.2);
        expect(order).toEqual([1, 2, 3]);
    });
});

describe('Timers — Nested / Chain', () => {
    it('should create a timer inside a timer callback', async () => {
        const order: number[] = [];
        Timers.CreateTimer(0.05, () => {
            order.push(1);
            Timers.CreateTimer(0.05, () => {
                order.push(2);
            });
        });
        await delay(0.2);
        expect(order).toEqual([1, 2]);
    });

    it('should chain timers sequentially', async () => {
        const order: number[] = [];
        Timers.CreateTimer(0.05, () => {
            order.push(1);
            Timers.CreateTimer(0.05, () => {
                order.push(2);
                Timers.CreateTimer(0.05, () => {
                    order.push(3);
                });
            });
        });
        await delay(0.3);
        expect(order).toEqual([1, 2, 3]);
    });

    it('should cancel parent from child timer', async () => {
        let parentFired = false;
        const parent = Timers.CreateTimer(0.1, () => {
            parentFired = true;
            return 0.1;
        });
        Timers.CreateTimer(0.05, () => {
            parent.cancel();
        });
        await delay(0.2);
        expect(parentFired).toBe(false);
    });
});

describe('Timers — Stress', () => {
    it('should handle many concurrent one-shot timers', async () => {
        let count = 0;
        for (let i = 0; i < 50; i++) {
            Timers.CreateTimer(0.03, () => {
                count++;
            });
        }
        await delay(0.1);
        expect(count).toBe(50);
    });

    it('should handle many repeating timers with pre-check guard', async () => {
        let total = 0;
        for (let i = 0; i < 20; i++) {
            Timers.CreateTimer(0.03, () => {
                // Check BEFORE increment to avoid overshoot when all 20
                // fire in the same batch
                if (total >= 100) return undefined;
                total++;
                return 0.03;
            });
        }
        await delay(0.5);
        expect(total).toBe(100);
    });
});

describe('Timers — RealTime vs GameTime', () => {
    it('should fire real-time timer', async () => {
        let fired = false;
        Timers.CreateTimer({ delay: 0.05, useGameTime: false, callback: () => { fired = true; } });
        await delay(0.1);
        expect(fired).toBe(true);
    });

    it('should fire game-time timer', async () => {
        let fired = false;
        Timers.CreateTimer({ delay: 0.05, useGameTime: true, callback: () => { fired = true; } });
        await delay(0.1);
        expect(fired).toBe(true);
    });

});

describe('Timers — Edge Cases', () => {
    it('should handle delay of 0', async () => {
        let fired = false;
        Timers.CreateTimer(0, () => { fired = true; });
        await delay(0.05);
        expect(fired).toBe(true);
    });

    it('should handle timer with no return (void)', async () => {
        let fired = false;
        const fn = (): void => { fired = true; };
        Timers.CreateTimer(0.03, fn);
        await delay(0.08);
        expect(fired).toBe(true);
    });
});

describe('Timers — Closure', () => {
    it('should capture local variables by closure', async () => {
        const msg = 'hello_from_closure';
        let captured = '';
        Timers.CreateTimer(0.03, () => {
            captured = msg;
        });
        await delay(0.08);
        expect(captured).toBe('hello_from_closure');
    });

    it('should capture mutable counter variable', async () => {
        let counter = 0;
        Timers.CreateTimer(0.03, () => {
            counter = 42;
        });
        await delay(0.08);
        expect(counter).toBe(42);
    });

    it('should capture and update mutable state across repeats', async () => {
        const state = { value: 0 };
        Timers.CreateTimer(0.03, () => {
            state.value++;
            if (state.value >= 5) return undefined;
            return 0.03;
        });
        await delay(0.3);
        expect(state.value).toBe(5);
    });

    it('should allow closure to reference its own handle for self-cancel', async () => {
        let count = 0;
        let handle: { cancel: () => void; readonly active: boolean; readonly name: string };
        handle = Timers.CreateTimer(0.03, () => {
            count++;
            if (count >= 3) {
                handle.cancel();
                return undefined;
            }
            return 0.03;
        });
        await delay(0.3);
        expect(count).toBe(3);
        expect(handle.active).toBe(false);
    });

    it('should work with closure in NextTick', async () => {
        const expected = 99;
        let result = 0;
        Timers.NextTick(() => {
            result = expected;
        });
        await delay(0.05);
        expect(result).toBe(99);
    });

    it('should capture multiple closed-over variables', async () => {
        const a = 10;
        const b = 20;
        let sum = 0;
        Timers.CreateTimer(0.03, () => {
            sum = a + b;
        });
        await delay(0.08);
        expect(sum).toBe(30);
    });

    it('should handle closure with object method call', async () => {
        const obj = {
            value: 0,
            add(n: number): void {
                this.value = this.value + n;
            },
        };
        Timers.CreateTimer(0.03, () => {
            obj.add(5);
        });
        await delay(0.08);
        expect(obj.value).toBe(5);
    });

    it('should allow closure to schedule another timer with its own state', async () => {
        const results: number[] = [];
        const ctx = { id: 'A', seq: 0 };
        const fn = (): void | number => {
            ctx.seq++;
            results.push(ctx.seq);
            if (ctx.seq >= 4) return undefined;
            return 0.03;
        };
        Timers.CreateTimer(0.03, fn);
        await delay(0.3);
        expect(results).toEqual([1, 2, 3, 4]);
    });

    it('should keep independent closure state across parallel timers', async () => {
        const results: number[] = [];
        const state1 = { id: 1, count: 0 };
        const state2 = { id: 2, count: 0 };

        Timers.CreateTimer(0.03, () => {
            state1.count++;
            results.push(1);
            if (state1.count >= 3) return undefined;
            return 0.03;
        });
        Timers.CreateTimer(0.03, () => {
            state2.count++;
            results.push(2);
            if (state2.count >= 3) return undefined;
            return 0.03;
        });

        await delay(0.3);
        expect(state1.count).toBe(3);
        expect(state2.count).toBe(3);
        expect(results).toEqual([1, 2, 1, 2, 1, 2]);
    });
});
