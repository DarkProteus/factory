import { describe, expect, it } from 'vitest';
import { createState, hash, runTicks, type ScheduledCommand } from './index';

const schedule: ScheduledCommand[] = [
  { tick: 0, command: { type: 'setCounter', key: 'a', value: 10 } },
  { tick: 3, command: { type: 'rollCounter', key: 'r1' } },
  { tick: 3, command: { type: 'setCounter', key: 'a', value: 11 } },
  { tick: 500, command: { type: 'rollCounter', key: 'r2' } },
  { tick: 999, command: { type: 'rollCounter', key: 'r3' } },
];

const run = (seed: number) => {
  const state = createState(seed);
  runTicks(state, schedule, 1000);
  return state;
};

describe('детерминизм', () => {
  it('одно зерно и одни команды дают один хеш после 1000 тиков', () => {
    const first = run(123);
    const second = run(123);
    expect(first.tick).toBe(1000);
    expect(hash(first)).toBe(hash(second));
  });

  it('команды применяются в своём тике', () => {
    const state = createState(5);
    runTicks(state, schedule, 3);
    expect(state.counters.a).toBe(10);
    expect(state.counters.r1).toBeUndefined();
    runTicks(state, schedule, 1);
    expect(state.counters.r1).toBeDefined();
    expect(state.counters.a).toBe(11);
  });

  it('разные зёрна дают разные хеши и разные броски генератора', () => {
    const a = run(1);
    const b = run(2);
    expect(a.counters.r1).not.toBe(b.counters.r1);
    expect(hash(a)).not.toBe(hash(b));
  });

  it('генератор выдаёт числа из [0, 1) и не залипает', () => {
    const state = run(77);
    const values = ['r1', 'r2', 'r3'].map((k) => state.counters[k]!);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(new Set(values).size).toBe(3);
  });

  it('хеш не зависит от порядка ключей и переживает JSON', () => {
    const state = run(8);
    const restored = JSON.parse(JSON.stringify(state));
    expect(hash(restored)).toBe(hash(state));
    const reordered = { counters: state.counters, rng: state.rng, tick: state.tick };
    expect(hash(reordered)).toBe(hash(state));
  });

  it('хеш меняется при изменении состояния', () => {
    const state = run(8);
    const before = hash(state);
    state.counters.a = 999;
    expect(hash(state)).not.toBe(before);
  });
});
