import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import {
  buildingAt,
  createState,
  pushToBelt,
  tick,
  type Command,
  type Dir,
  type PlacedBuilding,
  type SimState,
} from './index';
import { electrify, stocked } from './testKit';

const SWING = buildings.inserter.swingTicks;
const SLOTS = buildings.chest.slots;

function run(state: SimState, ticks: number): void {
  electrify(state);
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function build(cmds: Command[]): SimState {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, cmds);
  return state;
}

const b = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });
const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;

describe('манипулятор и сундук', () => {
  it('сундук и манипулятор описаны в content', () => {
    expect(buildings.chest.behavior).toBe('container');
    expect(buildings.inserter.behavior).toBe('inserter');
    expect(Number.isInteger(SWING) && SWING > 0).toBe(true);
    expect(Number.isInteger(SLOTS) && SLOTS > 0).toBe(true);
  });

  it('перекладывает предмет с конвейера в здание (сундук) по своему направлению', () => {
    const state = build([b('belt', 0, 0), b('belt', 1, 0), b('inserter', 2, 0), b('chest', 3, 0)]);
    expect(pushToBelt(at(state, 0, 0), 'ironOre')).toBe(true);
    run(state, 200);
    expect(at(state, 3, 0).slots).toEqual([{ item: 'ironOre', count: 1 }]);
    expect(at(state, 0, 0).belt).toEqual([]);
    expect(at(state, 1, 0).belt).toEqual([]);
    expect(at(state, 2, 0).output).toBeNull();
  });

  it('перекладывает предмет из здания (сундук) на конвейер, тратит swingTicks', () => {
    const state = build([b('chest', 0, 0), b('inserter', 1, 0), b('belt', 2, 0)]);
    at(state, 0, 0).slots = [{ item: 'ironPlate', count: 2 }];
    // Первый тик берёт предмет, ещё swingTicks тиков рука идёт к цели.
    run(state, SWING);
    expect(at(state, 2, 0).belt ?? []).toHaveLength(0);
    run(state, 1);
    expect(at(state, 2, 0).belt).toHaveLength(1);
    expect(at(state, 2, 0).belt![0]!.item).toBe('ironPlate');
    run(state, 400);
    expect(at(state, 0, 0).slots).toEqual([]);
  });

  it('работает в обратном направлении: dir задаёт, откуда и куда', () => {
    const state = build([b('belt', 2, 0, 3), b('inserter', 1, 0, 3), b('chest', 0, 0)]);
    pushToBelt(at(state, 2, 0), 'ironOre');
    run(state, 200);
    expect(at(state, 0, 0).slots).toEqual([{ item: 'ironOre', count: 1 }]);
  });

  it('ничего не делает без здания позади или впереди', () => {
    const state = build([b('inserter', 1, 0), b('chest', 2, 0)]);
    run(state, 100);
    expect(at(state, 1, 0).output).toBeNull();
    const state2 = build([b('chest', 0, 0), b('inserter', 1, 0)]);
    at(state2, 0, 0).slots = [{ item: 'ironOre', count: 1 }];
    run(state2, 100);
    expect(at(state2, 0, 0).slots).toEqual([{ item: 'ironOre', count: 1 }]);
    expect(at(state2, 1, 0).output).toBeNull();
  });

  it('полный сундук не принимает: манипулятор ждёт с предметом в руке и не теряет его', () => {
    const state = build([b('belt', 0, 0), b('inserter', 1, 0), b('chest', 2, 0)]);
    const chest = at(state, 2, 0);
    pushToBelt(at(state, 0, 0), 'ironPlate');
    // Рука берёт предмет с конвейера сразу и идёт к сундуку swingTicks тиков.
    run(state, 10);
    expect(at(state, 1, 0).output).toEqual({ item: 'ironPlate', count: 1 });
    // Сундук заполнили, пока предмет в руке.
    chest.slots = Array.from({ length: SLOTS }, () => ({ item: 'ironPlate', count: 100 }));
    run(state, 300);
    expect(at(state, 1, 0).output).toEqual({ item: 'ironPlate', count: 1 });
    expect(at(state, 1, 0).progress).toBe(SWING);
    // Освободили место: предмет ложится.
    chest.slots.pop();
    run(state, 1);
    expect(at(state, 1, 0).output).toBeNull();
    expect(chest.slots).toHaveLength(SLOTS);
  });

  it('не берёт предмет, который цель не примет (бур как цель)', () => {
    const state = build([b('chest', 0, 0), b('inserter', 1, 0), b('drill', 2, 0)]);
    at(state, 0, 0).slots = [{ item: 'ironOre', count: 3 }];
    run(state, 100);
    expect(at(state, 0, 0).slots).toEqual([{ item: 'ironOre', count: 3 }]);
    expect(at(state, 1, 0).output).toBeNull();
  });
});
