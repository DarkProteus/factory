import { describe, expect, it } from 'vitest';
import { buildingAt, createState, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { putIntoBuilding, takeFromBuilding, type BuildingSlot } from './manual';
import { give, stocked } from './testKit';

// Граничные случаи ручных перекладок: пустые ячейки, дробные и нулевые количества, частичный перенос.

const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });

function world(): { state: SimState; furnace: PlacedBuilding; chest: PlacedBuilding; gen: PlacedBuilding } {
  const state = stocked(createState(1, { width: 20, height: 20 }));
  tick(state, [build('furnace', 0, 0), build('chest', 8, 0), build('generator', 10, 0)]);
  state.inventory = [];
  const at = (x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;
  return { state, furnace: at(0, 0), chest: at(8, 0), gen: at(10, 0) };
}

const take = (s: SimState, b: PlacedBuilding, slot: BuildingSlot, slotCount?: number): void => takeFromBuilding(s, b.id, slot, slotCount);

describe('takeFromBuilding: нулевые и частично взятые ячейки', () => {
  it('ячейка с нулём не считается и не убирается (выход, топливо, сундук)', () => {
    const { state, furnace, chest, gen } = world();
    furnace.output = { item: 'ironPlate', count: 0 };
    gen.fuel = { item: 'coal', count: 0 };
    chest.slots = [{ item: 'ironPlate', count: 0 }];
    take(state, furnace, { kind: 'output' });
    take(state, gen, { kind: 'fuel' });
    take(state, chest, { kind: 'slot', index: 0 });
    expect(furnace.output).toEqual({ item: 'ironPlate', count: 0 });
    expect(gen.fuel).toEqual({ item: 'coal', count: 0 });
    expect(chest.slots).toEqual([{ item: 'ironPlate', count: 0 }]);
    expect(state.inventory).toEqual([]);
  });

  it('частичный перенос оставляет ячейку с остатком (выход, топливо, сундук)', () => {
    const { state, furnace, chest, gen } = world();
    // Инвентарь на одну ячейку: помещается одна полная стопка того, что положили первым.
    furnace.output = { item: 'ironPlate', count: 150 };
    take(state, furnace, { kind: 'output' }, 1);
    expect(furnace.output?.count).toBeGreaterThan(0);
    expect(furnace.output!.count).toBeLessThan(150);
    const moved = 150 - furnace.output!.count;
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: moved }]);

    state.inventory = [];
    gen.fuel = { item: 'coal', count: 500 };
    take(state, gen, { kind: 'fuel' }, 1);
    expect(gen.fuel?.count).toBe(500 - state.inventory[0]!.count);
    expect(gen.fuel!.count).toBeGreaterThan(0);

    state.inventory = [];
    chest.slots = [{ item: 'ironPlate', count: 400 }];
    take(state, chest, { kind: 'slot', index: 0 }, 1);
    expect(chest.slots).toHaveLength(1);
    expect(chest.slots![0]!.count).toBe(400 - state.inventory[0]!.count);
  });

  it('дробный и отрицательный индекс ячейки входа и сундука — без изменений', () => {
    const { state, furnace, chest } = world();
    furnace.input = [{ item: 'ironOre', count: 3 }];
    chest.slots = [{ item: 'ironPlate', count: 3 }];
    for (const index of [0.5, -1, 1]) {
      take(state, furnace, { kind: 'input', index });
      take(state, chest, { kind: 'slot', index });
    }
    expect(state.inventory).toEqual([]);
    expect(furnace.input).toEqual([{ item: 'ironOre', count: 3 }]);
    expect(chest.slots).toEqual([{ item: 'ironPlate', count: 3 }]);
  });

  it('сундук: забирается нужная ячейка, не первая', () => {
    const { state, chest } = world();
    chest.slots = [
      { item: 'ironPlate', count: 1 },
      { item: 'coal', count: 2 },
      { item: 'copperPlate', count: 3 },
    ];
    take(state, chest, { kind: 'slot', index: 1 });
    expect(chest.slots).toEqual([
      { item: 'ironPlate', count: 1 },
      { item: 'copperPlate', count: 3 },
    ]);
    expect(state.inventory).toEqual([{ item: 'coal', count: 2 }]);
  });

  it('без адреса ячейки и для здания без нужной ячейки — без изменений', () => {
    const { state, furnace } = world();
    takeFromBuilding(state, furnace.id, undefined as unknown as BuildingSlot);
    takeFromBuilding(state, 9999, { kind: 'output' });
    takeFromBuilding(state, furnace.id, { kind: 'slot', index: 0 });
    expect(state.inventory).toEqual([]);
  });
});

describe('putIntoBuilding: количество', () => {
  it('нуль, отрицательное и дробное количество ничего не кладут', () => {
    const { state, furnace } = world();
    give(state, 'ironOre', 10);
    for (const count of [0, -1, 1.5, Number.NaN]) putIntoBuilding(state, furnace.id, 'ironOre', count);
    expect(state.inventory).toEqual([{ item: 'ironOre', count: 10 }]);
    expect(furnace.input?.reduce((n, s) => n + s.count, 0) ?? 0).toBe(0);
  });

  it('кладёт ровно count и списывает столько же', () => {
    const { state, furnace } = world();
    give(state, 'ironOre', 10);
    putIntoBuilding(state, furnace.id, 'ironOre', 1);
    expect(state.inventory).toEqual([{ item: 'ironOre', count: 9 }]);
    putIntoBuilding(state, furnace.id, 'ironOre', 3);
    expect(state.inventory).toEqual([{ item: 'ironOre', count: 6 }]);
  });

  it('ничего не принято — инвентарь не трогается', () => {
    const { state, gen } = world();
    give(state, 'ironOre', 10);
    putIntoBuilding(state, gen.id, 'ironOre', 5);
    expect(state.inventory).toEqual([{ item: 'ironOre', count: 10 }]);
  });
});
