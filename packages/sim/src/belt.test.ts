import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import {
  BELT_CELL,
  BELT_GAP,
  buildingAt,
  createState,
  pushToBelt,
  tick,
  type Command,
  type Dir,
  type PlacedBuilding,
  type SimState,
} from './index';

const SPEED = buildings.belt.beltSpeed;

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function line(cells: [number, number, Dir][]): SimState {
  const state = createState(1, { width: 16, height: 16 });
  const cmds: Command[] = cells.map(([x, y, dir]) => ({ type: 'build', building: 'belt', x, y, dir }));
  tick(state, cmds);
  return state;
}

function at(state: SimState, x: number, y: number): PlacedBuilding {
  return buildingAt(state, x, y)!;
}

const items = (b: PlacedBuilding) => b.belt ?? [];

/** Все предметы цепочки от головы к хвосту и их пройденный путь от начала первой клетки. */
function chain(state: SimState, cells: [number, number][]): { item: string; dist: number }[] {
  const out: { item: string; dist: number }[] = [];
  for (let i = cells.length - 1; i >= 0; i--) {
    const [x, y] = cells[i]!;
    for (const it of items(at(state, x, y))) out.push({ item: it.item, dist: i * BELT_CELL + it.pos });
  }
  return out;
}

const straight = (n: number, y = 0): [number, number, Dir][] =>
  Array.from({ length: n }, (_, x) => [x, y, 1 as Dir]);

describe('конвейер', () => {
  it('описан в content как belt со скоростью', () => {
    expect(buildings.belt.behavior).toBe('belt');
    expect(buildings.belt.size).toEqual([1, 1]);
    expect(Number.isInteger(SPEED) && SPEED > 0 && SPEED < BELT_GAP).toBe(true);
  });

  it('проходит 10 клеток за расчётное число тиков', () => {
    const state = line(straight(10));
    expect(pushToBelt(at(state, 0, 0), 'ironOre')).toBe(true);
    const expected = Math.ceil((10 * BELT_CELL) / SPEED);
    run(state, expected - 1);
    expect(items(at(state, 9, 0))).toHaveLength(1);
    expect(items(at(state, 9, 0))[0]!.pos).toBeLessThan(BELT_CELL);
    run(state, 1);
    expect(items(at(state, 9, 0))).toEqual([{ item: 'ironOre', pos: BELT_CELL }]);
    run(state, 50);
    expect(items(at(state, 9, 0))).toEqual([{ item: 'ironOre', pos: BELT_CELL }]);
  });

  it('при заторе очередь стоит без потерь и наложений, потом едет дальше', () => {
    const cells = straight(3);
    const state = line(cells);
    // Здание без конвейера в конце — затор.
    tick(state, [{ type: 'build', building: 'drill', x: 3, y: 0, dir: 0 }]);
    let pushed = 0;
    for (let t = 0; t < 2000; t++) {
      if (pushToBelt(at(state, 0, 0), t % 2 ? 'ironPlate' : 'ironOre')) pushed++;
      tick(state, []);
    }
    const jam = chain(state, [[0, 0], [1, 0], [2, 0]]);
    // Ряд заполнен плотно: 3 клетки по 4 предмета + один в самом начале.
    expect(jam).toHaveLength(pushed);
    expect(pushed).toBe((3 * BELT_CELL) / BELT_GAP + 1);
    for (let i = 1; i < jam.length; i++) expect(jam[i - 1]!.dist - jam[i]!.dist).toBe(BELT_GAP);
    const before = jam.map((j) => j.item);
    run(state, 100);
    expect(chain(state, [[0, 0], [1, 0], [2, 0]])).toEqual(jam);

    // Снимаем затор: на месте бура — продолжение конвейера.
    tick(state, [
      { type: 'demolish', x: 3, y: 0 },
      { type: 'build', building: 'belt', x: 3, y: 0, dir: 1 },
      { type: 'build', building: 'belt', x: 4, y: 0, dir: 1 },
      { type: 'build', building: 'belt', x: 5, y: 0, dir: 1 },
      { type: 'build', building: 'belt', x: 6, y: 0, dir: 1 },
    ]);
    run(state, 400);
    const all: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]];
    const after = chain(state, all);
    expect(after.map((j) => j.item)).toEqual(before);
    expect(after[0]!.dist).toBe(7 * BELT_CELL);
    expect(items(at(state, 0, 0))).toHaveLength(0);
  });

  it.each([
    ['направо', 2 as Dir],
    ['налево', 0 as Dir],
  ])('проходит поворот %s и попадает на следующий конвейер', (_, turn) => {
    const dy = turn === 2 ? 1 : -1;
    const y0 = 5;
    const cells: [number, number, Dir][] = [
      [0, y0, 1],
      [1, y0, 1],
      [2, y0, turn],
      [2, y0 + dy, turn],
      [2, y0 + 2 * dy, turn],
    ];
    const state = line(cells);
    pushToBelt(at(state, 0, y0), 'ironOre');
    run(state, Math.ceil((5 * BELT_CELL) / SPEED));
    expect(items(at(state, 2, y0 + 2 * dy))).toEqual([{ item: 'ironOre', pos: BELT_CELL }]);
    for (const [x, y] of cells.slice(0, 4)) expect(items(at(state, x, y))).toHaveLength(0);
  });

  it('не передаёт предмет на конвейер, который смотрит навстречу', () => {
    const state = line([
      [0, 0, 1],
      [1, 0, 3],
    ]);
    pushToBelt(at(state, 0, 0), 'ironOre');
    run(state, 200);
    expect(items(at(state, 0, 0))).toEqual([{ item: 'ironOre', pos: BELT_CELL }]);
  });

  it('сохраняет порядок предметов', () => {
    const cells = straight(8);
    const state = line(cells);
    const order = ['ironOre', 'ironPlate', 'ammo', 'ironOre', 'ammo', 'ironPlate'];
    const queue = [...order];
    while (queue.length) {
      if (pushToBelt(at(state, 0, 0), queue[0]!)) queue.shift();
      tick(state, []);
    }
    run(state, 600);
    const got = chain(state, cells.map(([x, y]) => [x, y]));
    expect(got.map((g) => g.item)).toEqual(order);
    for (let i = 1; i < got.length; i++) expect(got[i - 1]!.dist - got[i]!.dist).toBe(BELT_GAP);
  });

  it('состояние сериализуется без потерь', () => {
    const state = line(straight(4));
    pushToBelt(at(state, 0, 0), 'ironOre');
    run(state, 37);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
