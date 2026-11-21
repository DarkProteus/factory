import { describe, expect, it } from 'vitest';
import { buildingAt, createState, pushToBelt, tick, type Command, type Dir, type PlacedBuilding, type SimState } from './index';
import { stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: Dir): Command => ({ type: 'build', building, x, y, dir });
const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;
const held = (state: SimState, x: number, y: number): number => at(state, x, y).belt?.length ?? 0;
const cells = (state: SimState, list: [number, number][]): number => list.reduce((n, [x, y]) => n + held(state, x, y), 0);

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

/** Подаёт предметы на вход (3,5) по мере освобождения места. */
function feed(state: SimState, count: number, maxTicks: number): void {
  let left = count;
  for (let t = 0; t < maxTicks && left > 0; t++) {
    if (pushToBelt(at(state, 3, 5), 'ironOre')) left--;
    tick(state, []);
  }
}

/** Вход (3,5)-(4,5), первый разделитель (5,5) на восток, затем остальные постройки. */
function plant(first: string, ...rest: Command[]): SimState {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, [build('belt', 3, 5, 1), build('belt', 4, 5, 1), build(first, 5, 5, 1), ...rest]);
  return state;
}

const FWD_OUT: Command[] = [build('belt', 7, 5, 1), build('belt', 8, 5, 1)];
const FWD_CELLS: [number, number][] = [[7, 5], [8, 5]];

describe('цепочка разделителей', () => {
  it('splitter -> splitter -> лента: предмет проходит и не застревает в буфере', () => {
    const state = plant('splitter', build('splitter', 6, 5, 1), ...FWD_OUT);
    feed(state, 1, 5);
    run(state, 200);
    expect(held(state, 5, 5)).toBe(0);
    expect(held(state, 6, 5)).toBe(0);
    expect(cells(state, FWD_CELLS)).toBe(1);
  });

  it('splitter -> filterSplitter: предмет проходит', () => {
    const state = plant('splitter', build('filterSplitter', 6, 5, 1), ...FWD_OUT);
    feed(state, 1, 5);
    run(state, 200);
    expect(held(state, 5, 5)).toBe(0);
    expect(held(state, 6, 5)).toBe(0);
    expect(cells(state, FWD_CELLS)).toBe(1);
  });

  it('filterSplitter -> splitter: предмет проходит', () => {
    const state = plant('filterSplitter', build('splitter', 6, 5, 1), ...FWD_OUT);
    feed(state, 1, 5);
    run(state, 200);
    expect(cells(state, FWD_CELLS)).toBe(1);
  });

  it('каскад из трёх разделителей: поток не теряется и не копится в буферах', () => {
    const state = plant('splitter', build('splitter', 6, 5, 1), build('splitter', 7, 5, 1), build('belt', 8, 5, 1), build('belt', 9, 5, 1));
    feed(state, 6, 400);
    run(state, 400);
    expect(cells(state, [[5, 5], [6, 5], [7, 5]])).toBe(0);
    expect(cells(state, [[3, 5], [4, 5], [8, 5], [9, 5]])).toBe(6);
  });

  it('все выходы каскада работают: предметы делятся по кругу, ничего не теряется', () => {
    const state = plant(
      'splitter',
      build('splitter', 6, 5, 1),
      build('belt', 7, 5, 1), build('belt', 8, 5, 1),
      build('belt', 6, 4, 0), build('belt', 6, 3, 0),
      build('belt', 6, 6, 2), build('belt', 6, 7, 2),
      build('belt', 5, 4, 0), build('belt', 5, 3, 0),
      build('belt', 5, 6, 2), build('belt', 5, 7, 2),
    );
    feed(state, 12, 400);
    run(state, 400);
    const all: [number, number][] = [[7, 5], [8, 5], [6, 4], [6, 3], [6, 6], [6, 7], [5, 4], [5, 3], [5, 6], [5, 7]];
    expect(cells(state, all)).toBe(12);
    expect(held(state, 6, 5)).toBe(0);
  });
});

describe('боковой выход разделителя в разделитель', () => {
  /** Левый выход (5,4) смотрит на север; цель — разделитель с заданным направлением. */
  const side = (dir: Dir): SimState =>
    plant('splitter', build('splitter', 5, 4, dir), build('belt', 5, 3, 0), build('belt', 5, 2, 0));

  it('разделитель, смотрящий в сторону выхода, принимает', () => {
    const state = side(0);
    feed(state, 1, 5);
    run(state, 200);
    expect(held(state, 5, 5)).toBe(0);
    expect(cells(state, [[5, 3], [5, 2]])).toBe(1);
  });

  it('разделитель, смотрящий иначе, не принимает: предмет остаётся в буфере', () => {
    for (const dir of [1, 2, 3] as Dir[]) {
      const state = side(dir);
      feed(state, 1, 5);
      run(state, 200);
      expect(held(state, 5, 5)).toBe(1);
      expect(held(state, 5, 4)).toBe(0);
      expect(cells(state, [[5, 3], [5, 2]])).toBe(0);
    }
  });

  it('соседний разделитель без выходов держит один предмет, остальные идут вперёд', () => {
    // Первый предмет уходит вперёд, второй — в боковой разделитель, где остаётся.
    const state = plant('splitter', build('splitter', 5, 4, 0), build('belt', 6, 5, 1), build('belt', 7, 5, 1));
    feed(state, 2, 50);
    run(state, 200);
    expect(held(state, 5, 4)).toBe(1);
    expect(cells(state, [[6, 5], [7, 5]])).toBe(1);
    expect(held(state, 5, 5)).toBe(0);
  });
});
