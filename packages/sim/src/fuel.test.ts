import { buildings, INVENTORY_SLOTS, items, recipes } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { FUEL_UNITS_PER_KJ } from './fuel';
import { applyCommand, buildingAt, createState, hash, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { accept, canAccept, takeFrom } from './transfer';
import { electrify, stocked } from './testKit';

const T = recipes.smeltIron.ticks;
const COAL_UNITS = items.coal.fuel * FUEL_UNITS_PER_KJ;
/** Энергия печи за тик в тех же единицах (Вт·тик). */
const PER_TICK = buildings.furnace.energy.kw * 1000;

const build = (building: string, x: number, y: number, dir = 1): Command => ({ type: 'build', building, x, y, dir: dir as 0 });

function furnaceWorld(): { state: SimState; f: PlacedBuilding } {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, [build('furnace', 2, 2)]);
  return { state, f: buildingAt(state, 2, 2)! };
}

function run(state: SimState, ticks: number): void {
  electrify(state);
  for (let i = 0; i < ticks; i++) tick(state, []);
}

describe('ячейка топлива', () => {
  it('топливо манипулятор кладёт в ячейку, прочее во вход', () => {
    const { f } = furnaceWorld();
    expect(canAccept(f, 'coal', buildings)).toBe(true);
    accept(f, 'coal', buildings);
    expect(f.fuel).toEqual({ item: 'coal', count: 1 });
    expect(f.input).toBeUndefined();
    accept(f, 'ironOre', buildings);
    expect(f.input).toEqual([{ item: 'ironOre', count: 1 }]);
    expect(f.fuel).toEqual({ item: 'coal', count: 1 });
  });

  it('ячейка вмещает одну стопку', () => {
    const { f } = furnaceWorld();
    f.fuel = { item: 'coal', count: items.coal.stack - 1 };
    expect(canAccept(f, 'coal', buildings)).toBe(true);
    accept(f, 'coal', buildings);
    expect(canAccept(f, 'coal', buildings)).toBe(false);
  });

  it('из печи берётся только выход, не топливо и не вход', () => {
    const { f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 5 };
    f.recipe = 'smeltIron';
    f.input = [{ item: 'ironOre', count: 1 }];
    expect(takeFrom(f, () => true, buildings)).toBeNull();
    f.output = { item: 'ironPlate', count: 1 };
    expect(takeFrom(f, () => true, buildings)).toBe('ironPlate');
    expect(f.fuel!.count).toBe(5);
  });

  it('генератор тоже принимает топливо в ячейку, но не руду', () => {
    const state = stocked(createState(1, { width: 16, height: 16 }));
    tick(state, [build('generator', 2, 2)]);
    const g = buildingAt(state, 2, 2)!;
    expect(canAccept(g, 'coal', buildings)).toBe(true);
    expect(canAccept(g, 'ironOre', buildings)).toBe(false);
    accept(g, 'coal', buildings);
    expect(g.fuel).toEqual({ item: 'coal', count: 1 });
  });

  it('сундук топливо кладёт как обычный предмет, без ячейки топлива', () => {
    const state = stocked(createState(1, { width: 16, height: 16 }));
    tick(state, [build('chest', 0, 0)]);
    const chest = buildingAt(state, 0, 0)!;
    accept(chest, 'coal', buildings);
    expect(chest.fuel).toBeUndefined();
    expect(chest.slots).toEqual([{ item: 'coal', count: 1 }]);
  });
});

describe('выбор рецепта печью по входу', () => {
  it('рецепт выбирается по пришедшей руде', () => {
    const { f } = furnaceWorld();
    accept(f, 'copperOre', buildings);
    expect(f.recipe).toBe('smeltCopper');
  });

  it('другой ингредиент не принимается, пока во входе есть руда', () => {
    const { f } = furnaceWorld();
    accept(f, 'ironOre', buildings);
    expect(canAccept(f, 'copperOre', buildings)).toBe(false);
    expect(canAccept(f, 'ironOre', buildings)).toBe(true);
  });

  it('другой ингредиент не принимается при идущем цикле, даже если вход пуст', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 1 };
    accept(f, 'ironOre', buildings);
    run(state, 5);
    expect(f.progress).toBeGreaterThan(0);
    expect(f.input).toEqual([{ item: 'ironOre', count: 0 }]);
    expect(canAccept(f, 'copperOre', buildings)).toBe(false);
  });

  it('при пустом входе и без цикла принимает другую руду, пока выход ещё не забран', () => {
    const { f } = furnaceWorld();
    f.recipe = 'smeltIron';
    f.input = [{ item: 'ironOre', count: 0 }];
    f.output = { item: 'ironPlate', count: 3 };
    expect(canAccept(f, 'copperOre', buildings)).toBe(true);
    accept(f, 'copperOre', buildings);
    expect(f.recipe).toBe('smeltCopper');
    expect(f.input).toEqual([{ item: 'copperOre', count: 1 }]);
  });
});

describe('расход топлива', () => {
  it('цикл тратит kw за тик: уголь списывается целиком, остаток энергии хранится в состоянии', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 2 };
    accept(f, 'ironOre', buildings);
    run(state, T);
    expect(f.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(f.fuel).toEqual({ item: 'coal', count: 1 });
    expect(f.burn).toBe(COAL_UNITS - T * PER_TICK);
  });

  it('последний уголь убирает ячейку, пустое поле не остаётся', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 1 };
    accept(f, 'ironOre', buildings);
    run(state, 1);
    expect(f.fuel).toBeUndefined();
    expect(f.burn).toBe(COAL_UNITS - PER_TICK);
  });

  it('без топлива цикл не стартует и руда остаётся во входе', () => {
    const { state, f } = furnaceWorld();
    accept(f, 'ironOre', buildings);
    run(state, T * 2);
    expect(f.progress).toBe(0);
    expect(f.input).toEqual([{ item: 'ironOre', count: 1 }]);
    expect(f.output).toBeNull();
  });

  it('цикл встаёт, когда топливо кончилось, и продолжается после его появления', () => {
    const { state, f } = furnaceWorld();
    // Энергии хватает ровно на 10 тиков цикла.
    f.burn = PER_TICK * 10;
    accept(f, 'ironOre', buildings);
    run(state, 50);
    expect(f.progress).toBe(10);
    expect(f.burn).toBe(0);
    expect(f.output).toBeNull();
    f.fuel = { item: 'coal', count: 1 };
    run(state, T - 10);
    expect(f.output).toEqual({ item: 'ironPlate', count: 1 });
  });

  it('простаивающая печь топливо не тратит', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 1 };
    run(state, 100);
    expect(f.fuel).toEqual({ item: 'coal', count: 1 });
    expect(f.burn ?? 0).toBe(0);
  });
});

describe('снос и хеш', () => {
  it('снос возвращает ячейку топлива в инвентарь', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 7 };
    applyCommand(state, { type: 'demolish', x: 2, y: 2 });
    expect(buildingAt(state, 2, 2)).toBeNull();
    expect(state.inventory).toContainEqual({ item: 'coal', count: 7 });
  });

  it('если топливо не помещается в инвентарь, снос запрещён', () => {
    const { state, f } = furnaceWorld();
    f.fuel = { item: 'coal', count: 7 };
    for (let i = 0; i < INVENTORY_SLOTS; i++) state.inventory.push({ item: 'ironPlate', count: items.ironPlate.stack });
    applyCommand(state, { type: 'demolish', x: 2, y: 2 });
    expect(buildingAt(state, 2, 2)).not.toBeNull();
  });

  it('ячейка топлива и остаток энергии входят в хеш', () => {
    const { state, f } = furnaceWorld();
    const h0 = hash(state);
    f.fuel = { item: 'coal', count: 1 };
    const h1 = hash(state);
    expect(h1).not.toBe(h0);
    f.burn = 5;
    expect(hash(state)).not.toBe(h1);
  });
});

describe('100 + 100 руды с углём', () => {
  it('печь переплавляет обе руды в 100 + 100 пластин, уголь уходит по kw', () => {
    const state = stocked(createState(1, { width: 16, height: 16 }));
    // Сундук руды -> манипулятор -> печь -> манипулятор -> сундук; уголь снизу манипулятором вверх.
    tick(state, [
      build('chest', 2, 0),
      build('inserter', 3, 0),
      build('furnace', 4, 0),
      build('inserter', 6, 0),
      build('chest', 7, 0),
      build('chest', 4, 3),
      build('inserter', 4, 2, 0),
    ]);
    const ore = buildingAt(state, 2, 0)!;
    const out = buildingAt(state, 7, 0)!;
    const coal = buildingAt(state, 4, 3)!;
    const f = buildingAt(state, 4, 0)!;
    ore.slots = [
      { item: 'ironOre', count: 100 },
      { item: 'copperOre', count: 100 },
    ];
    coal.slots = [{ item: 'coal', count: 20 }];
    electrify(state);
    const sum = (item: string): number => (out.slots ?? []).reduce((n, s) => n + (s.item === item ? s.count : 0), 0);
    const limit = 200 * T * 2;
    let t = 0;
    for (; t < limit && sum('ironPlate') + sum('copperPlate') < 200; t++) tick(state, []);
    expect(t).toBeLessThan(limit);
    expect(sum('ironPlate')).toBe(100);
    expect(sum('copperPlate')).toBe(100);
    // Энергия 200 циклов: kw * T тиков каждый; уголь с остатком в ячейке и счётчике.
    const spent = 200 * T * PER_TICK;
    const taken = 20 - coal.slots!.reduce((n, s) => n + s.count, 0);
    const burned = taken - (f.fuel?.count ?? 0);
    expect(burned * COAL_UNITS - (f.burn ?? 0)).toBe(spent);
    expect(burned).toBe(Math.ceil(spent / COAL_UNITS));
  });
});
