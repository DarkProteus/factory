import { INVENTORY_SLOTS, items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, hash, pushToBelt, type SimState } from './index';
import { give } from './testKit';

function world(): SimState {
  return createState(1, { width: 16, height: 16 });
}

/** Постройка тратит предмет-здание, поэтому он выдаётся перед командой (инвентарь после неё прежний). */
function build(state: SimState, building: string, x: number, y: number): void {
  give(state, building, 1);
  applyCommand(state, { type: 'build', building, x, y, dir: 1 });
}

const demolish = (state: SimState, x: number, y: number) => applyCommand(state, { type: 'demolish', x, y });

/** Забивает инвентарь полными стеками руды, кроме free ячеек. */
function fill(state: SimState, free: number): void {
  state.inventory = [];
  for (let i = 0; i < INVENTORY_SLOTS - free; i++) state.inventory.push({ item: 'ironPlate', count: items.ironPlate.stack });
}

describe('инвентарь игрока', () => {
  it('входит в состояние, сериализуется без потерь и входит в хеш', () => {
    const state = world();
    expect(state.inventory).toEqual([]);
    const before = hash(state);
    state.inventory.push({ item: 'ironOre', count: 3 });
    expect(hash(state)).not.toBe(before);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('снос конвейера отдаёт все предметы с него', () => {
    const state = world();
    build(state, 'belt', 2, 2);
    const belt = buildingAt(state, 2, 2)!;
    belt.belt = [
      { item: 'ironOre', pos: 10 },
      { item: 'ironOre', pos: 100 },
      { item: 'ironPlate', pos: 200 },
    ];
    demolish(state, 2, 2);
    expect(buildingAt(state, 2, 2)).toBeNull();
    expect(state.inventory).toEqual([
      { item: 'ironOre', count: 2 },
      { item: 'ironPlate', count: 1 },
      { item: 'belt', count: 1 },
    ]);
  });

  it('снос здания отдаёт выходной буфер', () => {
    const state = world();
    build(state, 'furnace', 4, 4);
    buildingAt(state, 4, 4)!.output = { item: 'ironPlate', count: 7 };
    demolish(state, 4, 4);
    expect(buildingAt(state, 4, 4)).toBeNull();
    expect(state.inventory).toEqual([
      { item: 'ironPlate', count: 7 },
      { item: 'furnace', count: 1 },
    ]);
  });

  it('снос отдаёт вход крафтера, ячейки контейнера и предмет в руке манипулятора', () => {
    const state = world();
    build(state, 'furnace', 4, 4);
    buildingAt(state, 4, 4)!.input = [{ item: 'ironOre', count: 4 }];
    build(state, 'chest', 8, 8);
    buildingAt(state, 8, 8)!.slots = [{ item: 'ammo', count: 5 }];
    build(state, 'inserter', 10, 10);
    buildingAt(state, 10, 10)!.output = { item: 'ironPlate', count: 1 };
    demolish(state, 4, 4);
    demolish(state, 8, 8);
    demolish(state, 10, 10);
    expect(Object.keys(state.buildings)).toHaveLength(0);
    expect(state.inventory).toEqual([
      { item: 'ironOre', count: 4 },
      { item: 'furnace', count: 1 },
      { item: 'ammo', count: 5 },
      { item: 'chest', count: 1 },
      { item: 'ironPlate', count: 1 },
      { item: 'inserter', count: 1 },
    ]);
  });

  it('при полном инвентаре снос запрещён, ничего не меняется', () => {
    const state = world();
    build(state, 'belt', 2, 2);
    fill(state, 0);
    pushToBelt(buildingAt(state, 2, 2)!, 'ironOre');
    const before = hash(state);
    demolish(state, 2, 2);
    expect(buildingAt(state, 2, 2)).not.toBeNull();
    expect(hash(state)).toBe(before);
  });

  it('снос атомарный: если помещается лишь часть содержимого, не уходит ничего', () => {
    const state = world();
    build(state, 'chest', 8, 8);
    buildingAt(state, 8, 8)!.slots = [
      { item: 'ironOre', count: 2 },
      { item: 'ammo', count: 2 },
    ];
    fill(state, 1);
    const before = hash(state);
    demolish(state, 8, 8);
    expect(buildingAt(state, 8, 8)).not.toBeNull();
    expect(state.inventory).toHaveLength(INVENTORY_SLOTS - 1);
    expect(hash(state)).toBe(before);
  });

  it('содержимое дополняет неполные ячейки и пустое здание сносится при полном инвентаре', () => {
    const state = world();
    build(state, 'furnace', 4, 4);
    buildingAt(state, 4, 4)!.output = { item: 'ironPlate', count: 1 };
    build(state, 'belt', 2, 2);
    // Инвентарь полон, но предметам-зданиям есть куда вернуться: у них свои неполные стопки.
    fill(state, 0);
    state.inventory[0] = { item: 'ironPlate', count: items.ironPlate.stack - 1 };
    state.inventory[1] = { item: 'furnace', count: 1 };
    state.inventory[2] = { item: 'belt', count: 1 };
    demolish(state, 4, 4);
    expect(buildingAt(state, 4, 4)).toBeNull();
    expect(state.inventory[0]!.count).toBe(items.ironPlate.stack);
    demolish(state, 2, 2);
    expect(buildingAt(state, 2, 2)).toBeNull();
  });
});

describe('снос печи посреди цикла (TASK-22)', () => {
  /** Печь с рудой во входе и запущенным циклом плавки: руда цикла уже списана со входа. */
  function smelting(): SimState {
    const state = world();
    build(state, 'furnace', 2, 2);
    const furnace = buildingAt(state, 2, 2)!;
    furnace.recipe = 'smeltIron';
    furnace.input = [{ item: 'ironOre', count: 2 }];
    furnace.progress = 50;
    return state;
  }

  it('ингредиенты идущего цикла возвращаются в инвентарь', () => {
    const state = smelting();
    demolish(state, 2, 2);
    expect(buildingAt(state, 2, 2)).toBeNull();
    expect(state.inventory).toEqual([
      { item: 'ironOre', count: 3 },
      { item: 'furnace', count: 1 },
    ]);
  });

  it('если ингредиентам цикла нет места, снос запрещён', () => {
    const state = smelting();
    fill(state, 0);
    const before = hash(state);
    demolish(state, 2, 2);
    expect(hash(state)).toBe(before);
  });

  it('печь без идущего цикла возвращает только вход', () => {
    const state = smelting();
    buildingAt(state, 2, 2)!.progress = 0;
    demolish(state, 2, 2);
    expect(state.inventory).toEqual([
      { item: 'ironOre', count: 2 },
      { item: 'furnace', count: 1 },
    ]);
  });
});
