import { describe, expect, it } from 'vitest';
import { buildingAt, canPlace, createState, footprintSize, type Dir, type SimState } from './index';
import { demolishAt, placeBuilding, topologyVersion } from './buildings';
import { cellIndex, createMap, depositAt, inBounds } from './grid';
import { give } from './testKit';

// Тесты на границы карты и области: убивают мутантов в проверках «<», «<=», «>=» и «+ w - 1».

const stateOf = (width: number, height: number): SimState => createState(1, { width, height });

describe('inBounds', () => {
  const map = createMap({ width: 4, height: 3 });

  it('принимает все четыре угла', () => {
    for (const [x, y] of [
      [0, 0],
      [3, 0],
      [0, 2],
      [3, 2],
    ]) {
      expect(inBounds(map, x!, y!)).toBe(true);
    }
  });

  it('отвергает клетку на один шаг за каждой стороной', () => {
    expect(inBounds(map, -1, 0)).toBe(false);
    expect(inBounds(map, 0, -1)).toBe(false);
    expect(inBounds(map, 4, 0)).toBe(false);
    expect(inBounds(map, 0, 3)).toBe(false);
  });

  it('отвергает дробные и нечисловые координаты внутри карты', () => {
    expect(inBounds(map, 1.5, 1)).toBe(false);
    expect(inBounds(map, 1, 1.5)).toBe(false);
    expect(inBounds(map, Number.NaN, 1)).toBe(false);
    expect(inBounds(map, 1, Number.NaN)).toBe(false);
  });

  it('индекс клетки — y*width + x (карта не квадратная)', () => {
    expect(cellIndex(map, 3, 2)).toBe(11);
    expect(cellIndex(map, 0, 1)).toBe(4);
    expect(cellIndex(map, 1, 0)).toBe(1);
  });
});

// rule: deposits
describe('createMap: размер и залежи', () => {
  it('нулевая, отрицательная и дробная сторона — RangeError с размером в тексте', () => {
    expect(() => createMap({ width: 0, height: 4 })).toThrow(RangeError);
    expect(() => createMap({ width: 4, height: 0 })).toThrow(RangeError);
    expect(() => createMap({ width: -1, height: 4 })).toThrow(RangeError);
    expect(() => createMap({ width: 4, height: -1 })).toThrow(RangeError);
    expect(() => createMap({ width: 1.5, height: 4 })).toThrow(RangeError);
    expect(() => createMap({ width: 4, height: 1.5 })).toThrow(RangeError);
    expect(() => createMap({ width: 0, height: 4 })).toThrow('Неверный размер карты 0×4');
  });

  it('карта 1×1 допустима', () => {
    expect(createMap({ width: 1, height: 1 }).tiles).toHaveLength(1);
  });

  it('залежь в последней клетке принимается, за краем — RangeError с координатами', () => {
    const map = createMap({ width: 4, height: 3, deposits: [{ x: 3, y: 2, item: 'ironOre', amount: 7 }] });
    expect(map.deposits[11]).toEqual({ item: 'ironOre', amount: 7, initial: 7 });
    expect(() => createMap({ width: 4, height: 3, deposits: [{ x: 0, y: 3, item: 'ironOre', amount: 1 }] })).toThrow('Залежь вне карты: 0,3');
    expect(() => createMap({ width: 4, height: 3, deposits: [{ x: -1, y: 0, item: 'ironOre', amount: 1 }] })).toThrow(RangeError);
    expect(() => createMap({ width: 4, height: 3, deposits: [{ x: 0, y: -1, item: 'ironOre', amount: 1 }] })).toThrow(RangeError);
  });

  it('неизвестный предмет залежи называется в тексте ошибки', () => {
    expect(() => createMap({ width: 2, height: 2, deposits: [{ x: 0, y: 0, item: 'gold', amount: 1 }] })).toThrow('Неизвестный предмет залежи: gold');
  });

  it('depositAt видит залежь в угловой клетке и не видит за краем', () => {
    const s = createState(1, { width: 4, height: 3, deposits: [{ x: 3, y: 2, item: 'coal', amount: 2 }] });
    expect(depositAt(s, 3, 2)?.item).toBe('coal');
    expect(depositAt(s, 4, 2)).toBeNull();
    expect(depositAt(s, 3, 3)).toBeNull();
    expect(depositAt(s, 0, -1)).toBeNull();
  });
});

describe('canPlace: границы отпечатка', () => {
  const dirs: Dir[] = [0, 1, 2, 3];

  it('отпечаток впритык к краю ставится, на клетку дальше — нет (все направления)', () => {
    const s = stateOf(8, 6);
    const defs = { wide: { size: [3, 2] as const, behavior: 'belt', hp: 1 } } as never;
    for (const dir of dirs) {
      const [w, h] = footprintSize([3, 2], dir);
      expect(canPlace(s, 'wide', 8 - w, 6 - h, dir, defs)).toBe(true);
      expect(canPlace(s, 'wide', 8 - w + 1, 6 - h, dir, defs)).toBe(false);
      expect(canPlace(s, 'wide', 8 - w, 6 - h + 1, dir, defs)).toBe(false);
      expect(canPlace(s, 'wide', 0, 0, dir, defs)).toBe(true);
      expect(canPlace(s, 'wide', -1, 0, dir, defs)).toBe(false);
      expect(canPlace(s, 'wide', 0, -1, dir, defs)).toBe(false);
    }
  });

  it('здание 1×1 ставится в последней клетке и не ставится за ней', () => {
    const s = stateOf(4, 3);
    expect(canPlace(s, 'belt', 3, 2, 0)).toBe(true);
    expect(canPlace(s, 'belt', 4, 2, 0)).toBe(false);
    expect(canPlace(s, 'belt', 3, 3, 0)).toBe(false);
  });

  it('неизвестный тип, дробные координаты и неверное направление отвергаются', () => {
    const s = stateOf(8, 8);
    expect(canPlace(s, 'nope', 1, 1, 0)).toBe(false);
    expect(canPlace(s, 'toString', 1, 1, 0)).toBe(false);
    expect(canPlace(s, 'belt', 1.5, 1, 0)).toBe(false);
    expect(canPlace(s, 'belt', 1, 1, 4)).toBe(false);
    expect(canPlace(s, 'belt', 1, 1, -1)).toBe(false);
  });

  it('занята любая клетка отпечатка, не только угловая', () => {
    const s = stateOf(8, 8);
    give(s, 'belt', 4);
    placeBuilding(s, 'belt', 3, 3, 0);
    // Бур 2×2 с левым верхним углом (2,2) накрывает (3,3), но не угол (2,2).
    expect(canPlace(s, 'drill', 2, 2, 0)).toBe(false);
    expect(canPlace(s, 'drill', 3, 2, 0)).toBe(false);
    expect(canPlace(s, 'drill', 2, 3, 0)).toBe(false);
    expect(canPlace(s, 'drill', 4, 3, 0)).toBe(true);
    expect(canPlace(s, 'drill', 3, 4, 0)).toBe(true);
  });
});

describe('постройка и снос: занятость и topologyVersion', () => {
  it('версия растёт ровно на единицу за постройку и за снос', () => {
    const s = stateOf(8, 8);
    give(s, 'belt', 4);
    expect(topologyVersion(s)).toBe(0);
    placeBuilding(s, 'belt', 1, 1, 0);
    expect(topologyVersion(s)).toBe(1);
    placeBuilding(s, 'belt', 2, 1, 0);
    expect(topologyVersion(s)).toBe(2);
    demolishAt(s, 1, 1);
    expect(topologyVersion(s)).toBe(3);
  });

  it('отвергнутая постройка и снос пустой клетки версию не меняют', () => {
    const s = stateOf(8, 8);
    give(s, 'belt', 1);
    placeBuilding(s, 'belt', 9, 9, 0);
    placeBuilding(s, 'chest', 1, 1, 0); // нет предмета-здания
    demolishAt(s, 3, 3);
    expect(topologyVersion(s)).toBe(0);
    expect(s.nextId).toBe(1);
  });

  it('постройка занимает весь отпечаток, снос освобождает его и не трогает соседей', () => {
    const s = stateOf(8, 8);
    give(s, 'drill', 1);
    give(s, 'belt', 2);
    placeBuilding(s, 'belt', 1, 2, 0);
    placeBuilding(s, 'belt', 4, 2, 0);
    placeBuilding(s, 'drill', 2, 2, 0);
    const id = buildingAt(s, 2, 2)!.id;
    const cells = [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ];
    for (const [x, y] of cells) expect(buildingAt(s, x!, y!)?.id).toBe(id);
    expect(buildingAt(s, 1, 2)?.type).toBe('belt');
    expect(buildingAt(s, 4, 2)?.type).toBe('belt');
    demolishAt(s, 3, 3);
    for (const [x, y] of cells) expect(buildingAt(s, x!, y!)).toBeNull();
    expect(buildingAt(s, 1, 2)?.type).toBe('belt');
    expect(buildingAt(s, 4, 2)?.type).toBe('belt');
    expect(s.map.occupancy.filter((v) => v !== 0)).toHaveLength(2);
  });

  it('buildingAt вне карты — null, неверное направление не ставит здание', () => {
    const s = stateOf(4, 3);
    give(s, 'belt', 2);
    expect(buildingAt(s, 4, 0)).toBeNull();
    expect(buildingAt(s, 0, 3)).toBeNull();
    expect(buildingAt(s, -1, 0)).toBeNull();
    placeBuilding(s, 'belt', 1, 1, 7);
    expect(buildingAt(s, 1, 1)).toBeNull();
    expect(s.inventory).toEqual([{ item: 'belt', count: 2 }]);
  });
});
