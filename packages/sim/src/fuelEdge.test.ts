import { buildings, type BuildingDef, type ItemDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import type { PlacedBuilding } from './buildings';
import { burnEnergy, burnTick, FUEL_UNITS_PER_KJ, fuelCanAccept, isFuel } from './fuel';

/** Свои определения предметов: второй вид топлива, слабое топливо и предмет без топлива. */
const defs: Readonly<Record<string, ItemDef>> = {
  coal: { name: 'Уголь', stack: 50, fuel: 4000 },
  wood: { name: 'Дрова', stack: 10, fuel: 1000 },
  twig: { name: 'Хворост', stack: 10, fuel: 1 },
  rock: { name: 'Камень', stack: 10 },
};

const furnace: BuildingDef = buildings.furnace;
const COST = buildings.furnace.energy.kw * 1000;

const bare = (extra: Partial<PlacedBuilding> = {}): PlacedBuilding => ({
  id: 1,
  type: 'furnace',
  x: 0,
  y: 0,
  dir: 0,
  progress: 0,
  output: null,
  ...extra,
});

describe('fuel: isFuel и fuelCanAccept', () => {
  it('предмет, которого нет в определениях, не топливо (без ошибки)', () => {
    expect(isFuel('nope', defs)).toBe(false);
    expect(isFuel('rock', defs)).toBe(false);
    expect(isFuel('coal', defs)).toBe(true);
  });

  it('ячейка с углём не принимает другой вид топлива, того же вида принимает до стопки', () => {
    const b = bare({ fuel: { item: 'coal', count: 3 } });
    expect(fuelCanAccept(b, furnace, 'wood', defs)).toBe(false);
    expect(fuelCanAccept(b, furnace, 'coal', defs)).toBe(true);
    b.fuel!.count = 50;
    expect(fuelCanAccept(b, furnace, 'coal', defs)).toBe(false);
  });

  it('пустая ячейка принимает любое топливо, не топливо и здание без ячейки — нет', () => {
    expect(fuelCanAccept(bare(), furnace, 'wood', defs)).toBe(true);
    expect(fuelCanAccept(bare(), furnace, 'rock', defs)).toBe(false);
    expect(fuelCanAccept(bare(), buildings.chest, 'wood', defs)).toBe(false);
  });
});

describe('fuel: burnTick', () => {
  it('здание не на топливе: true, ничего не трогает', () => {
    const b = bare({ fuel: { item: 'coal', count: 2 } });
    expect(burnTick(b, buildings.assembler, defs)).toBe(true);
    expect(burnTick(b, buildings.chest, defs)).toBe(true);
    expect(b.fuel).toEqual({ item: 'coal', count: 2 });
    expect(b.burn).toBeUndefined();
  });

  it('нет топлива и остатка: false, b.burn не появляется', () => {
    const b = bare();
    expect(burnTick(b, furnace, defs)).toBe(false);
    expect(b.burn).toBeUndefined();
  });

  it('топлива не хватило на тик: false, сожжённое уходит в остаток, ячейка опустела', () => {
    const b = bare({ fuel: { item: 'twig', count: 1 } });
    expect(burnTick(b, furnace, defs)).toBe(false);
    expect(b.burn).toBe(FUEL_UNITS_PER_KJ);
    expect(b.fuel).toBeUndefined();
  });

  it('остаток без топлива сохраняется', () => {
    const b = bare({ burn: 100 });
    expect(burnTick(b, furnace, defs)).toBe(false);
    expect(b.burn).toBe(100);
  });

  it('топливо без энергии в определениях даёт 0 и сгорает без ошибки', () => {
    const b = bare({ fuel: { item: 'mystery', count: 2 } });
    expect(burnTick(b, furnace, defs)).toBe(false);
    expect(b.fuel).toBeUndefined();
    expect(b.burn).toBeUndefined();
  });

  it('хватает остатка: топливо не трогается, остаток уменьшается на тик', () => {
    const b = bare({ burn: COST + 5, fuel: { item: 'coal', count: 2 } });
    expect(burnTick(b, furnace, defs)).toBe(true);
    expect(b.fuel).toEqual({ item: 'coal', count: 2 });
    expect(b.burn).toBe(5);
  });
});

describe('fuel: burnEnergy', () => {
  it('остатка ровно хватает: топливо не сгорает', () => {
    const b = bare({ burn: 500, fuel: { item: 'coal', count: 2 } });
    expect(burnEnergy(b, 500, defs)).toBe(500);
    expect(b.fuel).toEqual({ item: 'coal', count: 2 });
    expect(b.burn).toBe(0);
  });

  it('остатка с запасом: топливо не сгорает', () => {
    const b = bare({ burn: 1000, fuel: { item: 'coal', count: 2 } });
    expect(burnEnergy(b, 400, defs)).toBe(400);
    expect(b.fuel).toEqual({ item: 'coal', count: 2 });
    expect(b.burn).toBe(600);
  });

  it('последний предмет сгорел: ячейка удаляется, а не остаётся с нулём', () => {
    const b = bare({ fuel: { item: 'coal', count: 1 } });
    expect(burnEnergy(b, 100, defs)).toBe(100);
    expect(b.fuel).toBeUndefined();
    expect(b.burn).toBe(4000 * FUEL_UNITS_PER_KJ - 100);
  });

  it('топливо без энергии в определениях: списано 0, ячейка опустела без ошибки', () => {
    const b = bare({ fuel: { item: 'mystery', count: 2 } });
    expect(burnEnergy(b, 100, defs)).toBe(0);
    expect(b.fuel).toBeUndefined();
  });
});
