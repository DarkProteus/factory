import { stoneCount } from '@factory/render';
import { deserialize, serialize } from '@factory/save';
import { tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { createDemo } from './demo';

const stones = (s: SimState) => s.map.deposits.map((d) => (d ? stoneCount(d.amount, d.initial) : 0));

describe('залежи после сохранения', () => {
  it('число камней частично выработанной залежи то же, что до сохранения', () => {
    const state = createDemo(1);
    for (let t = 0; t < 3000; t++) tick(state, []);
    const before = stones(state);
    // Нужны частично выработанные залежи, иначе тест ничего не проверяет.
    expect(state.map.deposits.some((d) => d && d.amount < d.initial)).toBe(true);
    expect(before.some((n) => n > 0 && n < 5)).toBe(true);
    expect(stones(deserialize(serialize(state)))).toEqual(before);
  });
});
