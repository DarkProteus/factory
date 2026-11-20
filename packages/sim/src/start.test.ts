import { START_KIT, startMap } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { createState, depositAt, hash } from './index';

describe('стартовая партия по умолчанию', () => {
  it('карта строится из startMap: размер и клетки пятен', () => {
    const { map } = createState(1);
    expect(map.width).toBe(startMap.width);
    expect(map.height).toBe(startMap.height);
    let cells = 0;
    for (const p of startMap.patches) {
      for (let y = p.y; y < p.y + p.h; y++) {
        for (let x = p.x; x < p.x + p.w; x++) {
          expect(depositAt({ map }, x, y)).toEqual({ item: p.item, amount: p.amount, initial: p.amount });
          cells++;
        }
      }
    }
    expect(map.deposits.filter((d) => d !== null)).toHaveLength(cells);
  });

  it('в инвентаре ровно START_KIT, без построек и без ручной добычи', () => {
    const state = createState(1);
    const kit = Object.fromEntries(state.inventory.map((s) => [s.item, s.count]));
    expect(kit).toEqual(START_KIT);
    expect(state.inventory).toHaveLength(Object.keys(START_KIT).length);
    expect(state.buildings).toEqual({});
    expect(state.mining).toBeNull();
  });

  it('детерминирована: одно зерно даёт одно состояние', () => {
    expect(hash(createState(7))).toBe(hash(createState(7)));
  });

  it('с явной картой инвентарь пуст: стартовый набор только у стартовой карты', () => {
    expect(createState(1, { width: 8, height: 8 }).inventory).toEqual([]);
  });
});
