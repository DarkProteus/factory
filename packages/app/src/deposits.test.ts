import { MINING_TICKS } from '@factory/content';
import { stoneCount } from '@factory/render';
import { deserialize, serialize } from '@factory/save';
import { createState, tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';

const stones = (s: SimState) => s.map.deposits.map((d) => (d ? stoneCount(d.amount, d.initial) : 0));

describe('залежи после сохранения', () => {
  it('число камней частично выработанной залежи то же, что до сохранения', () => {
    // Малая сцена: одна клетка залежи, которую игрок добывает руками.
    const state = createState(1, { width: 8, height: 8, deposits: [{ x: 3, y: 3, item: 'ironOre', amount: 8 }] });
    tick(state, [{ type: 'startMining', x: 3, y: 3 }]);
    for (let t = 0; t < MINING_TICKS * 7; t++) tick(state, []);
    const before = stones(state);
    // Нужна частично выработанная залежь, иначе тест ничего не проверяет.
    expect(state.map.deposits.some((d) => d && d.amount < d.initial)).toBe(true);
    expect(before.some((n) => n > 0 && n < 5)).toBe(true);
    expect(stones(deserialize(serialize(state)))).toEqual(before);
  });
});
