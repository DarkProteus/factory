import { describe, expect, it } from 'vitest';
import { createState, runTicks, type ScheduledCommand } from './index';

const set = (tick: number, key: string, value: number): ScheduledCommand => ({ tick, command: { type: 'setCounter', key, value } });

describe('runTicks', () => {
  it('прогоняет ровно count тиков', () => {
    const state = createState(1);
    runTicks(state, [], 5);
    expect(state.tick).toBe(5);
    runTicks(state, [], 0);
    expect(state.tick).toBe(5);
  });

  it('команда применяется в своём тике, раньше не действует', () => {
    const state = createState(1);
    runTicks(state, [set(3, 'a', 7)], 3);
    expect(state.counters.a).toBeUndefined();
    runTicks(state, [set(3, 'a', 7)], 1);
    expect(state.counters.a).toBe(7);
  });

  it('команды одного тика идут в порядке списка, в том числе при трёх и более', () => {
    const state = createState(1);
    runTicks(state, [set(0, 'a', 1), set(0, 'a', 2), set(0, 'b', 3), set(0, 'a', 4)], 1);
    expect(state.counters).toEqual({ a: 4, b: 3 });
  });

  it('команды разных тиков не мешаются, список не обязан быть отсортирован', () => {
    const state = createState(1);
    runTicks(state, [set(2, 'a', 20), set(0, 'a', 10), set(1, 'b', 5)], 1);
    expect(state.counters).toEqual({ a: 10 });
    runTicks(state, [set(2, 'a', 20), set(0, 'a', 10), set(1, 'b', 5)], 2);
    expect(state.counters).toEqual({ a: 20, b: 5 });
  });

  it('команды тиков, которых не было в прогоне, и прошлых тиков не применяются', () => {
    const state = createState(1);
    runTicks(state, [], 2);
    runTicks(state, [set(1, 'old', 1), set(4, 'far', 1)], 2);
    expect(state.counters).toEqual({});
    expect(state.tick).toBe(4);
  });
});
