import { describe, expect, it } from 'vitest';
import { BELT_CELL, buildingAt, createState, pushToBelt, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { contents, placeBuilding } from './buildings';
import { createMap } from './grid';
import { give, stocked } from './testKit';

const plain = (extra: Partial<PlacedBuilding> = {}): PlacedBuilding => ({ id: 1, type: 'chest', x: 0, y: 0, dir: 0, progress: 0, output: null, ...extra });

describe('buildingAt: границы карты', () => {
  it('клетка за краем — null, даже если индекс y*width+x попадает в чужую клетку', () => {
    const s = createState(1, { width: 4, height: 3 });
    give(s, 'belt', 2);
    placeBuilding(s, 'belt', 0, 1, 0);
    placeBuilding(s, 'belt', 3, 0, 0);
    // (4,0) даёт индекс 4 — это клетка (0,1); (-1,1) даёт индекс 3 — это клетка (3,0).
    expect(buildingAt(s, 4, 0)).toBeNull();
    expect(buildingAt(s, -1, 1)).toBeNull();
    expect(buildingAt(s, 0, 1)?.type).toBe('belt');
    expect(buildingAt(s, 3, 0)?.type).toBe('belt');
  });
});

describe('placeBuilding: поля нового здания', () => {
  it('обычное здание без роли подземного, поля начальные', () => {
    const s = createState(1, { width: 6, height: 6 });
    give(s, 'belt', 1);
    placeBuilding(s, 'belt', 2, 2, 1);
    const b = buildingAt(s, 2, 2)!;
    expect('underground' in b).toBe(false);
    expect(b).toEqual({ id: 1, type: 'belt', x: 2, y: 2, dir: 1, progress: 0, output: null });
  });
});

describe('createMap: тип клетки', () => {
  it('все клетки — ground', () => {
    expect(createMap({ width: 3, height: 2 }).tiles).toEqual(['ground', 'ground', 'ground', 'ground', 'ground', 'ground']);
  });
});

describe('contents: что лежит в здании', () => {
  it('пустое здание — пустой список', () => {
    expect(contents(plain())).toEqual([]);
  });

  it('вход и ячейки берутся только если есть, без лишних элементов', () => {
    expect(contents(plain({ slots: [{ item: 'coal', count: 2 }] }))).toEqual([{ item: 'coal', count: 2 }]);
    expect(contents(plain({ input: [{ item: 'ironOre', count: 1 }] }))).toEqual([{ item: 'ironOre', count: 1 }]);
    expect(contents(plain({ input: [{ item: 'ironOre', count: 1 }], slots: [{ item: 'coal', count: 2 }] }))).toEqual([
      { item: 'ironOre', count: 1 },
      { item: 'coal', count: 2 },
    ]);
  });

  it('неизвестная технология лаборатории ничего не добавляет и не ломает подсчёт', () => {
    expect(contents(plain({ unit: 'noSuchTech' }))).toEqual([]);
  });

  it('предметы конвейера, выход и топливо считаются по одному', () => {
    const b = plain({
      belt: [{ item: 'coal', pos: 1 }],
      output: { item: 'ironPlate', count: 3 },
      fuel: { item: 'coal', count: 4 },
    });
    expect(contents(b)).toEqual([
      { item: 'coal', count: 1 },
      { item: 'ironPlate', count: 3 },
      { item: 'coal', count: 4 },
    ]);
  });
});

describe('снос выхода подземного: на входе остаётся то, что не в тоннеле', () => {
  const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });

  it('предмет в первой клетке входа не уходит в инвентарь и остаётся на ленте', () => {
    const s: SimState = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('undergroundBelt', 3, 5), build('undergroundBelt', 7, 5)]);
    const input = buildingAt(s, 3, 5)!;
    expect(pushToBelt(input, 'coal')).toBe(true);
    input.belt!.push({ item: 'ironPlate', pos: BELT_CELL + 10 });
    s.inventory = [];
    tick(s, [{ type: 'demolish', x: 7, y: 5 }]);
    expect(input.belt).toHaveLength(1);
    expect(input.belt![0]!.item).toBe('coal');
    expect(input.belt![0]!.pos).toBeLessThan(BELT_CELL);
    expect(s.inventory.find((x) => x.item === 'ironPlate')?.count).toBe(1);
    expect(s.inventory.find((x) => x.item === 'coal')).toBeUndefined();
  });
});
