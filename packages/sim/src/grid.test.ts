import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, depositAt, footprintSize, hash, tick, type Command, type Dir } from './index';
import { createMap } from './grid';
import { give, stocked } from './testKit';

const build = (x: number, y: number, dir: Dir = 0, building = 'drill'): Command => ({ type: 'build', building, x, y, dir });
const small = () => stocked(createState(1, { width: 8, height: 6, deposits: [{ x: 3, y: 2, item: 'ironOre', amount: 500 }] }));

describe('карта', () => {
  it('createMap без параметров даёт пустую карту 64×64 (стартовая карта — в start.test.ts)', () => {
    const map = createMap();
    expect(map.width).toBe(64);
    expect(map.height).toBe(64);
    expect(map.tiles).toHaveLength(64 * 64);
    expect(map.occupancy.every((id) => id === 0)).toBe(true);
    expect(map.deposits.every((d) => d === null)).toBe(true);
  });

  it('залежь читается по координатам клетки', () => {
    const state = small();
    expect(depositAt(state, 3, 2)).toEqual({ item: 'ironOre', amount: 500, initial: 500 });
    expect(depositAt(state, 2, 3)).toBeNull();
    expect(depositAt(state, -1, 0)).toBeNull();
    expect(depositAt(state, 8, 0)).toBeNull();
  });

  it('залежь с неизвестным предметом или вне карты отвергается при создании', () => {
    expect(() => createState(1, { width: 4, height: 4, deposits: [{ x: 0, y: 0, item: 'gold', amount: 1 }] })).toThrow();
    expect(() => createState(1, { width: 4, height: 4, deposits: [{ x: 4, y: 0, item: 'ironOre', amount: 1 }] })).toThrow();
  });
});

describe('отпечаток здания', () => {
  it('квадратный размер не меняется при повороте', () => {
    for (const dir of [0, 1, 2, 3] as const) expect(footprintSize([2, 2], dir)).toEqual([2, 2]);
  });

  it('у прямоугольного ширина и высота меняются местами при E и W', () => {
    expect(footprintSize([3, 1], 0)).toEqual([3, 1]);
    expect(footprintSize([3, 1], 1)).toEqual([1, 3]);
    expect(footprintSize([3, 1], 2)).toEqual([3, 1]);
    expect(footprintSize([3, 1], 3)).toEqual([1, 3]);
  });

  it('команда строит прямоугольное здание из переданной таблицы с учётом направления', () => {
    const defs = { bar: { size: [3, 1] as const, behavior: 'belt' as const, hp: 1 } };
    const state = give(small(), 'bar', 1);
    applyCommand(state, build(1, 1, 1, 'bar'), defs);
    expect(buildingAt(state, 1, 3)?.type).toBe('bar');
    expect(buildingAt(state, 2, 1)).toBeNull();
  });
});

describe('постройка', () => {
  it('здание 2×2 занимает все четыре клетки', () => {
    const state = small();
    tick(state, [build(2, 1)]);
    const b = state.buildings[1];
    expect(b).toMatchObject({ id: 1, type: 'drill', x: 2, y: 1, dir: 0 });
    expect(state.nextId).toBe(2);
    for (const [x, y] of [[2, 1], [3, 1], [2, 2], [3, 2]] as const) expect(buildingAt(state, x, y)).toBe(b);
    for (const [x, y] of [[1, 1], [4, 1], [2, 0], [2, 3], [4, 3]] as const) expect(buildingAt(state, x, y)).toBeNull();
    expect(state.map.occupancy.filter((id) => id !== 0)).toHaveLength(4);
  });

  it('хранит направление, заданное при постройке', () => {
    const state = small();
    for (const [i, dir] of ([0, 1, 2, 3] as const).entries()) applyCommand(state, build(i * 2, 0, dir));
    expect(Object.values(state.buildings).map((b) => b.dir)).toEqual([0, 1, 2, 3]);
  });

  it('здание поверх занятых клеток не ставится, включая частичное перекрытие', () => {
    const state = small();
    applyCommand(state, build(2, 1));
    const before = hash(state);
    for (const [x, y] of [[2, 1], [3, 2], [1, 0], [3, 0], [1, 2]] as const) {
      applyCommand(state, build(x, y));
      expect(hash(state)).toBe(before);
    }
    expect(state.nextId).toBe(2);
    applyCommand(state, build(4, 1));
    expect(Object.keys(state.buildings)).toHaveLength(2);
  });

  it('здание не ставится за пределами карты', () => {
    const state = small();
    const before = hash(state);
    for (const [x, y] of [[-1, 0], [0, -1], [7, 0], [0, 5], [7, 5], [8, 0], [100, 100]] as const) {
      applyCommand(state, build(x, y));
    }
    expect(hash(state)).toBe(before);
    applyCommand(state, build(6, 4));
    expect(buildingAt(state, 7, 5)?.id).toBe(1);
  });

  it('неверные команды молча игнорируются', () => {
    const state = small();
    const before = hash(state);
    const bad = [
      build(0, 0, 0, 'nope'),
      build(0, 0, 0, 'constructor'),
      build(0.5, 0),
      build(0, 0, 4 as Dir),
      build(NaN, 0),
      { type: 'demolish', x: 0, y: 0 } as Command,
      { type: 'demolish', x: -5, y: 99 } as Command,
    ];
    for (const c of bad) expect(() => applyCommand(state, c)).not.toThrow();
    expect(hash(state)).toBe(before);
  });
});

describe('снос', () => {
  it('освобождает все клетки, на них снова можно строить; работает с любой клетки', () => {
    const state = small();
    applyCommand(state, build(2, 1));
    applyCommand(state, { type: 'demolish', x: 3, y: 2 });
    expect(state.buildings).toEqual({});
    expect(state.map.occupancy.every((id) => id === 0)).toBe(true);
    applyCommand(state, build(3, 2, 2));
    expect(state.buildings[2]).toMatchObject({ id: 2, type: 'drill', x: 3, y: 2, dir: 2 });
  });

  it('сносит только одно здание', () => {
    const state = small();
    applyCommand(state, build(0, 0));
    applyCommand(state, build(2, 0));
    applyCommand(state, { type: 'demolish', x: 0, y: 1 });
    expect(Object.keys(state.buildings)).toEqual(['2']);
    expect(buildingAt(state, 2, 0)?.id).toBe(2);
    expect(buildingAt(state, 1, 1)).toBeNull();
  });
});

describe('состояние', () => {
  it('карта и здания сериализуются в JSON без потерь', () => {
    const state = small();
    applyCommand(state, build(2, 1, 3));
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(hash(JSON.parse(JSON.stringify(state)))).toBe(hash(state));
  });
});
