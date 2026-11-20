import { INVENTORY_SLOTS } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, hash, tick, type BuildingSlot, type Command, type PlacedBuilding, type SimState } from './index';
import { contents } from './buildings';
import { takeFromBuilding } from './manual';
import { give, stocked } from './testKit';

const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });

/** Состояние с печью (0,0), сборщиком (4,0), сундуком (8,0), генератором (10,0); инвентарь пуст. */
function world(): { state: SimState; furnace: PlacedBuilding; asm: PlacedBuilding; chest: PlacedBuilding; gen: PlacedBuilding } {
  const state = stocked(createState(1, { width: 20, height: 20 }));
  tick(state, [build('furnace', 0, 0), build('assembler', 4, 0), build('chest', 8, 0), build('generator', 10, 0)]);
  state.inventory = [];
  const at = (x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;
  return { state, furnace: at(0, 0), asm: at(4, 0), chest: at(8, 0), gen: at(10, 0) };
}

const take = (state: SimState, building: PlacedBuilding, slot: BuildingSlot): void =>
  applyCommand(state, { type: 'takeFromBuilding', building: building.id, slot });
const put = (state: SimState, building: PlacedBuilding, item: string, count: number): void =>
  applyCommand(state, { type: 'putIntoBuilding', building: building.id, item, count });

/** Сколько предметов лежит в инвентаре и во всех зданиях (с ингредиентами идущих циклов). */
function total(state: SimState): number {
  let n = state.inventory.reduce((sum, s) => sum + s.count, 0);
  for (const b of Object.values(state.buildings) as PlacedBuilding[]) n += contents(b).reduce((sum, s) => sum + s.count, 0);
  return n;
}

describe('takeFromBuilding', () => {
  it('забирает выход целиком и очищает его', () => {
    const { state, furnace } = world();
    furnace.output = { item: 'ironPlate', count: 7 };
    take(state, furnace, { kind: 'output' });
    expect(furnace.output).toBeNull();
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 7 }]);
  });

  it('забирает топливо и убирает ячейку', () => {
    const { state, furnace } = world();
    furnace.fuel = { item: 'coal', count: 12 };
    take(state, furnace, { kind: 'fuel' });
    expect(furnace.fuel).toBeUndefined();
    expect(state.inventory).toEqual([{ item: 'coal', count: 12 }]);
  });

  it('забирает вход: стек остаётся с нулём', () => {
    const { state, asm } = world();
    applyCommand(state, { type: 'setRecipe', building: asm.id, recipe: 'circuit' });
    asm.input![1]!.count = 5;
    take(state, asm, { kind: 'input', index: 1 });
    expect(asm.input![1]).toEqual({ item: 'copperCable', count: 0 });
    expect(state.inventory).toEqual([{ item: 'copperCable', count: 5 }]);
  });

  it('забирает ячейку сундука по номеру и сдвигает остальные', () => {
    const { state, chest } = world();
    chest.slots = [
      { item: 'stone', count: 3 },
      { item: 'coal', count: 4 },
    ];
    take(state, chest, { kind: 'slot', index: 0 });
    expect(chest.slots).toEqual([{ item: 'coal', count: 4 }]);
    expect(state.inventory).toEqual([{ item: 'stone', count: 3 }]);
  });

  it('забирает топливо генератора', () => {
    const { state, gen } = world();
    gen.fuel = { item: 'coal', count: 3 };
    take(state, gen, { kind: 'fuel' });
    expect(gen.fuel).toBeUndefined();
    expect(state.inventory).toEqual([{ item: 'coal', count: 3 }]);
  });

  it('забирает сколько помещается, остаток лежит в здании', () => {
    const { state, furnace } = world();
    furnace.output = { item: 'ironPlate', count: 20 };
    state.inventory = [{ item: 'ironPlate', count: 95 }];
    takeFromBuilding(state, furnace.id, { kind: 'output' }, 1);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 100 }]);
    expect(furnace.output).toEqual({ item: 'ironPlate', count: 15 });
  });

  it('полный инвентарь: без изменений', () => {
    const { state, furnace } = world();
    furnace.output = { item: 'ironPlate', count: 3 };
    state.inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'stone', count: 50 }));
    const before = hash(state);
    take(state, furnace, { kind: 'output' });
    expect(hash(state)).toBe(before);
  });

  it('игнорирует неверные адреса, пустые ячейки и неизвестное здание', () => {
    const { state, furnace, chest } = world();
    chest.slots = [{ item: 'stone', count: 3 }];
    const before = hash(state);
    take(state, furnace, { kind: 'output' });
    take(state, furnace, { kind: 'fuel' });
    take(state, furnace, { kind: 'input', index: 0 });
    take(state, chest, { kind: 'slot', index: 5 });
    take(state, chest, { kind: 'slot', index: -1 });
    take(state, chest, { kind: 'slot', index: 0.5 });
    take(state, chest, { kind: 'output' });
    applyCommand(state, { type: 'takeFromBuilding', building: 999, slot: { kind: 'output' } });
    applyCommand(state, { type: 'takeFromBuilding', building: chest.id, slot: undefined as unknown as BuildingSlot });
    expect(hash(state)).toBe(before);
  });

  it('не трогает ингредиенты идущего цикла', () => {
    const { state, furnace } = world();
    furnace.recipe = 'smeltIron';
    furnace.input = [{ item: 'ironOre', count: 0 }];
    furnace.progress = 5;
    const before = hash(state);
    take(state, furnace, { kind: 'input', index: 0 });
    expect(hash(state)).toBe(before);
  });
});

describe('putIntoBuilding', () => {
  it('кладёт топливо печи в ячейку топлива, руду во вход', () => {
    const { state, furnace } = world();
    give(state, 'coal', 10);
    give(state, 'ironOre', 4);
    put(state, furnace, 'coal', 10);
    put(state, furnace, 'ironOre', 4);
    expect(furnace.fuel).toEqual({ item: 'coal', count: 10 });
    // Вход печи вмещает inputBuffer порций рецепта; остальная руда остаётся в инвентаре.
    expect(furnace.input).toEqual([{ item: 'ironOre', count: 2 }]);
    expect(state.inventory).toEqual([{ item: 'ironOre', count: 2 }]);
  });

  it('кладёт только то, что принял бы манипулятор; лишнее остаётся в инвентаре', () => {
    const { state, asm } = world();
    applyCommand(state, { type: 'setRecipe', building: asm.id, recipe: 'ironGear' });
    give(state, 'ironPlate', 10);
    give(state, 'copperPlate', 3);
    put(state, asm, 'ironPlate', 10);
    put(state, asm, 'copperPlate', 3);
    // inputBuffer 2: вход сборщика вмещает две порции рецепта (2 пластины по 2).
    expect(asm.input).toEqual([{ item: 'ironPlate', count: 4 }]);
    expect(state.inventory).toEqual([
      { item: 'ironPlate', count: 6 },
      { item: 'copperPlate', count: 3 },
    ]);
  });

  it('сборщик без рецепта ничего не принимает', () => {
    const { state, asm } = world();
    give(state, 'ironPlate', 5);
    const before = hash(state);
    put(state, asm, 'ironPlate', 5);
    expect(hash(state)).toBe(before);
  });

  it('кладёт не больше, чем есть в инвентаре, и не больше запрошенного', () => {
    const { state, chest } = world();
    give(state, 'stone', 5);
    put(state, chest, 'stone', 100);
    expect(chest.slots).toEqual([{ item: 'stone', count: 5 }]);
    give(state, 'stone', 9);
    put(state, chest, 'stone', 2);
    expect(chest.slots).toEqual([{ item: 'stone', count: 7 }]);
    expect(state.inventory).toEqual([{ item: 'stone', count: 7 }]);
  });

  it('полный сундук: лишнее остаётся в инвентаре', () => {
    const { state, chest } = world();
    chest.slots = Array.from({ length: 16 }, () => ({ item: 'stone', count: 50 }));
    give(state, 'stone', 4);
    put(state, chest, 'stone', 4);
    expect(state.inventory).toEqual([{ item: 'stone', count: 4 }]);
  });

  it('генератор принимает только топливо', () => {
    const { state, gen } = world();
    give(state, 'coal', 6);
    give(state, 'stone', 6);
    put(state, gen, 'stone', 6);
    put(state, gen, 'coal', 6);
    expect(gen.fuel).toEqual({ item: 'coal', count: 6 });
    expect(state.inventory).toEqual([{ item: 'stone', count: 6 }]);
  });

  it('игнорирует неверное количество и неизвестное здание', () => {
    const { state, chest } = world();
    give(state, 'stone', 5);
    const before = hash(state);
    for (const count of [0, -3, 1.5, NaN]) put(state, chest, 'stone', count);
    applyCommand(state, { type: 'putIntoBuilding', building: 999, item: 'stone', count: 1 });
    expect(hash(state)).toBe(before);
  });
});

describe('перекладка: сохранение предметов', () => {
  it('число предметов в мире и инвентаре не меняется при любых перекладках', () => {
    const { state, furnace, asm, chest, gen } = world();
    applyCommand(state, { type: 'setRecipe', building: asm.id, recipe: 'circuit' });
    give(state, 'coal', 80);
    give(state, 'ironOre', 30);
    give(state, 'ironPlate', 30);
    give(state, 'copperCable', 30);
    give(state, 'stone', 900);
    furnace.output = { item: 'copperPlate', count: 9 };
    const start = total(state);
    const targets = [furnace, asm, chest, gen];
    const items = ['coal', 'ironOre', 'ironPlate', 'copperCable', 'stone', 'copperPlate'];
    const slots: BuildingSlot[] = [{ kind: 'output' }, { kind: 'fuel' }, { kind: 'input', index: 0 }, { kind: 'input', index: 1 }, { kind: 'slot', index: 0 }];
    for (let i = 0; i < 120; i++) {
      const b = targets[i % targets.length]!;
      if (i % 3 === 0) take(state, b, slots[i % slots.length]!);
      else put(state, b, items[i % items.length]!, 1 + (i % 7));
      expect(total(state)).toBe(start);
      // Между командами идёт симуляция: плавка и крафт превращают предметы, но общее число не меняют (1 в 1).
      tick(state, []);
    }
  });

  it('команды детерминированы: одинаковые входы дают одинаковый хеш', () => {
    const run = (): number | string => {
      const { state, chest } = world();
      give(state, 'stone', 20);
      put(state, chest, 'stone', 20);
      take(state, chest, { kind: 'slot', index: 0 });
      return hash(state);
    };
    expect(run()).toBe(run());
  });
});
