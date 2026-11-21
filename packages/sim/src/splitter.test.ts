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
  splitterNextOutput,
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

/** Разделитель (5,5) смотрит на восток; вход — две клетки сзади, у выходов по две клетки. */
const FWD: [number, number][] = [[6, 5], [7, 5]];
const LEFT: [number, number][] = [[5, 4], [5, 3]];
const RIGHT: [number, number][] = [[5, 6], [5, 7]];

function plant(exits: { fwd?: boolean; left?: boolean; right?: boolean } = { fwd: true, left: true, right: true }): SimState {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  const cmds = [build('belt', 3, 5, 1), build('belt', 4, 5, 1), build('splitter', 5, 5, 1)];
  if (exits.fwd) cmds.push(build('belt', 6, 5, 1), build('belt', 7, 5, 1));
  if (exits.left) cmds.push(build('belt', 5, 4, 0), build('belt', 5, 3, 0));
  if (exits.right) cmds.push(build('belt', 5, 6, 2), build('belt', 5, 7, 2));
  tick(state, cmds);
  return state;
}

/** Подаёт предметы на вход по мере освобождения места. */
function feed(state: SimState, queue: string[], maxTicks: number): void {
  for (let t = 0; t < maxTicks && queue.length > 0; t++) {
    if (pushToBelt(at(state, 3, 5), queue[0]!)) queue.shift();
    tick(state, []);
  }
}

// rule: splitter
describe('разделитель (TASK-29)', () => {
  it('описан в content: 1×1, без энергии', () => {
    expect(buildings.splitter.behavior).toBe('splitter');
    expect(buildings.splitter.size).toEqual([1, 1]);
    expect('energy' in buildings.splitter).toBe(false);
  });

  it('раздаёт по кругу вперёд, влево, вправо', () => {
    const state = plant();
    feed(state, ['ironOre', 'copperOre', 'coal', 'ironOre', 'copperOre', 'coal'], 500);
    run(state, 300);
    expect(kinds(state, FWD)).toEqual(['ironOre', 'ironOre']);
    expect(kinds(state, LEFT)).toEqual(['copperOre', 'copperOre']);
    expect(kinds(state, RIGHT)).toEqual(['coal', 'coal']);
  });

  it('выход без ленты пропускается', () => {
    const state = plant({ fwd: true, right: true });
    feed(state, ['ironOre', 'copperOre', 'coal', 'stone'], 500);
    run(state, 300);
    expect(kinds(state, FWD)).toEqual(['ironOre', 'coal']);
    expect(kinds(state, RIGHT)).toEqual(['copperOre', 'stone']);
  });

  it('лента, смотрящая на разделитель, не считается выходом', () => {
    const state = plant({ fwd: false, left: false, right: false });
    tick(state, [build('belt', 6, 5, 3)]);
    pushToBelt(at(state, 3, 5), 'ironOre');
    run(state, 400);
    expect(kinds(state, [[6, 5]])).toEqual([]);
    expect(at(state, 5, 5).belt).toHaveLength(1);
  });

  it('занятый выход пропускается, остальные продолжают работать', () => {
    // Вперёд лента в 1 клетку без продолжения: заполнится и встанет.
    const state = plant({ left: true, right: true });
    tick(state, [build('belt', 6, 5, 1)]);
    const queue = Array.from({ length: 30 }, (_, i) => (i % 2 ? 'ironPlate' : 'ironOre'));
    feed(state, queue, 4000);
    run(state, 600);
    expect(queue).toHaveLength(0);
    expect(kinds(state, [[6, 5]])).toHaveLength(BELT_CELL / BELT_GAP + 1);
    const total = kinds(state, [[3, 5], [4, 5], [5, 5], [6, 5], ...LEFT, ...RIGHT]).length;
    expect(total).toBe(30);
  });

  it('при заторе всех выходов предметы стоят и не теряются', () => {
    const state = plant({ fwd: true });
    tick(state, [{ type: 'demolish', x: 7, y: 5 }]);
    let pushed = 0;
    for (let t = 0; t < 3000; t++) {
      if (pushToBelt(at(state, 3, 5), 'ironOre')) pushed++;
      tick(state, []);
    }
    const snapshot = hash(state.buildings);
    run(state, 200);
    expect(hash(state.buildings)).toBe(snapshot);
    const held = kinds(state, [[3, 5], [4, 5], [5, 5], [6, 5]]).length;
    expect(held).toBe(pushed);
    // Освободили выход: всё доезжает.
    tick(state, [build('belt', 7, 5, 1), build('belt', 8, 5, 1), build('belt', 9, 5, 1)]);
    run(state, 1500);
    expect(kinds(state, [[3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5]])).toHaveLength(pushed);
  });

  it('не принимает ленту сбоку', () => {
    const state = plant({ fwd: true });
    tick(state, [build('belt', 5, 4, 2)]);
    pushToBelt(at(state, 5, 4), 'ironOre');
    run(state, 400);
    expect(at(state, 5, 5).belt ?? []).toHaveLength(0);
    expect(at(state, 5, 4).belt).toHaveLength(1);
  });

  it('состояние сериализуется без потерь и детерминировано', () => {
    const a = plant();
    const b = plant();
    for (const s of [a, b]) feed(s, ['ironOre', 'copperOre', 'coal', 'stone'], 120);
    expect(hash(a)).toBe(hash(b));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    // Круговой индекс — часть состояния: после перезагрузки раздача продолжается с того же выхода.
    const copy = JSON.parse(JSON.stringify(a)) as SimState;
    feed(a, ['ironOre', 'ironOre', 'ironOre'], 300);
    feed(copy, ['ironOre', 'ironOre', 'ironOre'], 300);
    expect(hash(copy)).toBe(hash(a));
  });

  it('при сносе буфер возвращается в инвентарь', () => {
    const state = plant({ fwd: false, left: false, right: false });
    pushToBelt(at(state, 3, 5), 'ironOre');
    run(state, 200);
    expect(at(state, 5, 5).belt).toHaveLength(1);
    tick(state, [{ type: 'demolish', x: 5, y: 5 }]);
    expect(state.inventory.find((s) => s.item === 'ironOre')?.count).toBe(1);
  });
});

describe('splitterNextOutput', () => {
  it('без фильтра возвращает круговой индекс, с фильтром учитывает допустимые выходы', () => {
    for (const progress of [0, 1, 2]) expect(splitterNextOutput({ progress }, 'ironOre')).toBe(progress);
    // Предмет-фильтр идёт только вперёд.
    expect(splitterNextOutput({ progress: 2, filter: 'ironOre' }, 'ironOre')).toBe(0);
    // Остальные — по кругу боковых: с 0 и 1 на левый, с 2 на правый.
    expect(splitterNextOutput({ progress: 0, filter: 'ironOre' }, 'coal')).toBe(1);
    expect(splitterNextOutput({ progress: 1, filter: 'ironOre' }, 'coal')).toBe(1);
    expect(splitterNextOutput({ progress: 2, filter: 'ironOre' }, 'coal')).toBe(2);
  });
});
