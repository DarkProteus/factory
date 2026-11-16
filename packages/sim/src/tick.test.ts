import { describe, expect, it } from 'vitest';
import { createState, tick, type Command } from './index';

describe('состояние и тик', () => {
  it('состояние создаётся из зерна с нулевым счётчиком тиков', () => {
    const state = createState(42);
    expect(state.tick).toBe(0);
  });

  it('счётчик тиков растёт на 1 за шаг', () => {
    const state = createState(1);
    for (let i = 1; i <= 5; i++) {
      tick(state, []);
      expect(state.tick).toBe(i);
    }
  });

  it('состояние сериализуется в JSON без потерь', () => {
    const state = createState(7);
    tick(state, [{ type: 'setCounter', key: 'a', value: 3 }, { type: 'rollCounter', key: 'r' }]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('команды', () => {
  it('применяются в тике, в котором переданы', () => {
    const state = createState(1);
    tick(state, []);
    tick(state, [{ type: 'setCounter', key: 'a', value: 5 }]);
    expect(state.counters.a).toBe(5);
    expect(state.tick).toBe(2);
  });

  it('применяются в порядке поступления: последняя запись побеждает', () => {
    const state = createState(1);
    const commands: Command[] = [
      { type: 'setCounter', key: 'a', value: 1 },
      { type: 'setCounter', key: 'a', value: 2 },
      { type: 'setCounter', key: 'a', value: 3 },
    ];
    tick(state, commands);
    expect(state.counters.a).toBe(3);
  });

  it('порядок влияет на результат с генератором', () => {
    const a = createState(9);
    const b = createState(9);
    tick(a, [{ type: 'rollCounter', key: 'x' }, { type: 'rollCounter', key: 'y' }]);
    tick(b, [{ type: 'rollCounter', key: 'y' }, { type: 'rollCounter', key: 'x' }]);
    expect(a.counters.x).toBe(b.counters.y);
    expect(a.counters.y).toBe(b.counters.x);
    expect(a.counters.x).not.toBe(a.counters.y);
  });
});
