import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import {
  BELT_CELL,
  BELT_GAP,
  buildingAt,
  createState,
  hash,
  pushToBelt,
  tick,
  type Command,
  type Dir,
  type PlacedBuilding,
  type SimState,
} from './index';
import { stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: Dir): Command => ({ type: 'build', building, x, y, dir });

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;
const kinds = (state: SimState, cells: [number, number][]): string[] =>
  cells.flatMap(([x, y]) => (at(state, x, y).belt ?? []).map((it) => it.item));

/** Фильтрующий разделитель (5,5) смотрит на восток; вход — две клетки сзади, у выходов по две клетки. */
const FWD: [number, number][] = [[6, 5], [7, 5]];
const LEFT: [number, number][] = [[5, 4], [5, 3]];
const RIGHT: [number, number][] = [[5, 6], [5, 7]];

function plant(exits: { fwd?: boolean; left?: boolean; right?: boolean } = { fwd: true, left: true, right: true }): SimState {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  const cmds = [build('belt', 3, 5, 1), build('belt', 4, 5, 1), build('filterSplitter', 5, 5, 1)];
  if (exits.fwd) cmds.push(build('belt', 6, 5, 1), build('belt', 7, 5, 1));
  if (exits.left) cmds.push(build('belt', 5, 4, 0), build('belt', 5, 3, 0));
  if (exits.right) cmds.push(build('belt', 5, 6, 2), build('belt', 5, 7, 2));
  tick(state, cmds);
  return state;
}

const setFilter = (state: SimState, item: string | null): void => tick(state, [{ type: 'setFilter', building: at(state, 5, 5).id, item }]);

/** Подаёт предметы на вход по мере освобождения места. */
function feed(state: SimState, queue: string[], maxTicks: number): void {
  for (let t = 0; t < maxTicks && queue.length > 0; t++) {
    if (pushToBelt(at(state, 3, 5), queue[0]!)) queue.shift();
    tick(state, []);
  }
}

// rule: filter-splitter
describe('фильтрующий разделитель (TASK-37)', () => {
  it('описан в content: 1×1, без энергии', () => {
    expect(buildings.filterSplitter.behavior).toBe('filterSplitter');
    expect(buildings.filterSplitter.size).toEqual([1, 1]);
  });

  it('подходящие идут только вперёд, остальные — влево и вправо по кругу', () => {
    const state = plant();
    setFilter(state, 'ironOre');
    feed(state, ['ironOre', 'copperOre', 'ironOre', 'coal', 'copperOre', 'stone'], 800);
    run(state, 300);
    expect(kinds(state, FWD)).toEqual(['ironOre', 'ironOre']);
    expect(kinds(state, LEFT)).toEqual(['copperOre', 'copperOre']);
    expect(kinds(state, RIGHT)).toEqual(['coal', 'stone']);
  });

  it('неподходящие не идут вперёд, даже если боковых выходов нет', () => {
    const state = plant({ fwd: true });
    setFilter(state, 'ironOre');
    pushToBelt(at(state, 3, 5), 'coal');
    run(state, 400);
    expect(kinds(state, FWD)).toEqual([]);
    expect(at(state, 5, 5).belt).toHaveLength(1);
  });

  it('подходящий ждёт в буфере, если впереди занято, и не уходит вбок', () => {
    const state = plant({ left: true, right: true });
    tick(state, [build('belt', 6, 5, 1)]);
    setFilter(state, 'ironOre');
    const queue = Array.from({ length: 30 }, () => 'ironOre');
    feed(state, queue, 4000);
    run(state, 600);
    // Лента вперёд в одну клетку заполнена, остальное стоит позади, в стороны ничего не ушло.
    expect(kinds(state, [[6, 5]])).toHaveLength(BELT_CELL / BELT_GAP + 1);
    expect(kinds(state, [...LEFT, ...RIGHT])).toEqual([]);
    expect(at(state, 5, 5).belt).toHaveLength(1);
    expect(queue.length).toBeGreaterThan(0);
  });

  it('подходящий без ленты впереди стоит в буфере', () => {
    const state = plant({ left: true, right: true });
    setFilter(state, 'ironOre');
    pushToBelt(at(state, 3, 5), 'ironOre');
    run(state, 400);
    expect(at(state, 5, 5).belt).toHaveLength(1);
    expect(kinds(state, [...LEFT, ...RIGHT])).toEqual([]);
  });

  it('без фильтра работает как обычный разделитель', () => {
    const state = plant();
    feed(state, ['ironOre', 'copperOre', 'coal', 'ironOre', 'copperOre', 'coal'], 500);
    run(state, 300);
    expect(kinds(state, FWD)).toEqual(['ironOre', 'ironOre']);
    expect(kinds(state, LEFT)).toEqual(['copperOre', 'copperOre']);
    expect(kinds(state, RIGHT)).toEqual(['coal', 'coal']);
  });

  it('команда ставит и снимает фильтр', () => {
    const state = plant();
    setFilter(state, 'coal');
    expect(at(state, 5, 5).filter).toBe('coal');
    setFilter(state, null);
    expect(at(state, 5, 5).filter ?? null).toBeNull();
  });

  it('неверные команды игнорируются', () => {
    const state = plant();
    const id = at(state, 5, 5).id;
    const beltId = at(state, 4, 5).id;
    const before = hash(state.buildings);
    tick(state, [
      { type: 'setFilter', building: id, item: 'noSuchItem' },
      { type: 'setFilter', building: 999, item: 'coal' },
      { type: 'setFilter', building: beltId, item: 'coal' },
    ]);
    expect(at(state, 5, 5).filter ?? null).toBeNull();
    expect(at(state, 4, 5).filter).toBeUndefined();
    expect(hash(state.buildings)).toBe(before);
  });

  it('фильтр входит в хеш и в JSON-копию состояния', () => {
    const a = plant();
    const b = plant();
    setFilter(a, 'coal');
    setFilter(b, 'ironOre');
    expect(hash(a)).not.toBe(hash(b));
    const c = plant();
    setFilter(c, 'coal');
    expect(hash(c)).toBe(hash(a));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it('при сносе буфер возвращается в инвентарь', () => {
    const state = plant({ left: false, right: false, fwd: false });
    setFilter(state, 'ironOre');
    pushToBelt(at(state, 3, 5), 'ironOre');
    run(state, 200);
    expect(at(state, 5, 5).belt).toHaveLength(1);
    tick(state, [{ type: 'demolish', x: 5, y: 5 }]);
    expect(state.inventory.find((s) => s.item === 'ironOre')?.count).toBe(1);
  });
});
