import { buildings, recipes } from '@factory/content';
import { describe, expect, it } from 'vitest';
import {
  buildingAt,
  createState,
  pushToBelt,
  tick,
  type Command,
  type PlacedBuilding,
  type SimState,
} from './index';

const ORE = 100;
const E = 1;
const cmd = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: E });

/** Конвейер -> манипулятор -> печь -> манипулятор -> сундук. */
function plant(): SimState {
  const state = createState(1, { width: 16, height: 16 });
  tick(state, [
    cmd('belt', 0, 0),
    cmd('belt', 1, 0),
    cmd('belt', 2, 0),
    cmd('inserter', 3, 0),
    cmd('furnace', 4, 0),
    cmd('inserter', 6, 0),
    cmd('chest', 7, 0),
  ]);
  return state;
}

/** Сколько предметов данного вида лежит во всех зданиях. */
function count(state: SimState, item: string): number {
  let n = 0;
  for (const b of Object.values(state.buildings) as PlacedBuilding[]) {
    for (const it of b.belt ?? []) if (it.item === item) n += 1;
    // Руда в идущем цикле печи уже списана со входа, но пластины ещё нет.
    if (item === 'ironOre' && b.recipe && b.progress > 0) n += 1;
    for (const s of [b.output, ...(b.input ?? []), ...(b.slots ?? [])]) if (s?.item === item) n += s.count;
  }
  return n;
}

describe('руда -> пластины', () => {
  it(`${ORE} руды по конвейеру превращаются ровно в ${ORE} пластин`, () => {
    const state = plant();
    const chest = buildingAt(state, 7, 0)!;
    const belt = buildingAt(state, 0, 0)!;
    let fed = 0;
    const limit = ORE * recipes.smeltIron.ticks * 2;
    let t = 0;
    for (; t < limit; t++) {
      if (fed < ORE && pushToBelt(belt, 'ironOre')) fed += 1;
      tick(state, []);
      expect(count(state, 'ironOre') + count(state, 'ironPlate') + (ORE - fed)).toBe(ORE);
      if (count(state, 'ironPlate') === ORE && chest.slots?.length) {
        if (chest.slots.reduce((n, s) => n + s.count, 0) === ORE) break;
      }
    }
    expect(t).toBeLessThan(limit);
    expect(fed).toBe(ORE);
    expect(chest.slots).toEqual([{ item: 'ironPlate', count: ORE }]);
    expect(count(state, 'ironOre')).toBe(0);
  });

  it('печь не берёт руды больше, чем вмещает: при полном входе манипулятор ждёт', () => {
    const state = createState(1, { width: 16, height: 16 });
    tick(state, [cmd('chest', 1, 0), cmd('inserter', 2, 0), cmd('furnace', 3, 0)]);
    const chest = buildingAt(state, 1, 0)!;
    const hand = buildingAt(state, 2, 0)!;
    const furnace = buildingAt(state, 3, 0)!;
    chest.slots = [{ item: 'ironOre', count: 10 }];
    const cap = recipes.smeltIron.in.ironOre! * buildings.furnace.inputBuffer;
    for (let i = 0; i < 150; i++) {
      tick(state, []);
      expect(furnace.input?.[0]?.count ?? 0).toBeLessThanOrEqual(cap);
    }
    expect(furnace.input).toEqual([{ item: 'ironOre', count: cap }]);
    // Вход полон: манипулятор ничего не берёт и ждёт с пустой рукой.
    expect(hand.output).toBeNull();
    // 10 = 1 в цикле + 2 на входе + остаток в сундуке.
    expect(chest.slots).toEqual([{ item: 'ironOre', count: 7 }]);
    // Цикл завершился, вход освободился: манипулятор снова подаёт руду.
    for (let i = 0; i < recipes.smeltIron.ticks; i++) tick(state, []);
    expect(furnace.input).toEqual([{ item: 'ironOre', count: cap }]);
    expect(chest.slots).toEqual([{ item: 'ironOre', count: 6 }]);
  });
});
