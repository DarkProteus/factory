import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP, createState, tick, type Command, type SimState } from './index';
import { give } from './testKit';

// Таймер без DOM- и node-типов: в sim их нет.
const now = (): number => (globalThis as unknown as { performance: { now(): number } }).performance.now();

/** Кольца 2 × WIDTH клеток; RINGS колец дают RINGS * 2 * WIDTH = 10 000 конвейеров. */
const RINGS = 25;
const WIDTH = 200;
const CELLS = RINGS * 2 * WIDTH;

/**
 * Бюджеты тика, мс (TASK-40): заданы по замеру движущегося завода: минимум пачек на тихой машине ~1,0 мс (кольца)
 * и ~1,2 мс (кольца с разделителями). Бюджет — 4 × замера: запас нужен CI-раннерам и соседним воркерам,
 * откат скорости в 4 раза и больше тест ловит. Прогон бенчмарка отдельным шагом pnpm test (см. package.json).
 */
const BUDGET_MS = 4;
const BUDGET_SPLIT_MS = 5;

/** Предметы клетки от головы к хвосту: три из четырёх слотов, ровно через BELT_GAP, так что кольцо едет без пробок. */
const CELL_POSITIONS = [BELT_CELL / 2, BELT_CELL / 2 - BELT_GAP, 0];

/**
 * Завод из колец: верхний ряд кольца едет на восток, нижний — на запад, на концах повороты.
 * Все конвейеры загружены, предметы циркулируют, сток им не нужен. С withSplitters в верхнем ряду каждая
 * десятая клетка — разделитель, боковые выходы вливаются в нижний ряд своего кольца и в нижний ряд кольца выше (TASK-29).
 */
function factory(withSplitters: boolean): SimState {
  const state = give(createState(1, { width: WIDTH, height: RINGS * 2 }), 'belt', CELLS);
  give(state, 'splitter', CELLS);
  const cmds: Command[] = [];
  for (let r = 0; r < RINGS; r++) {
    const y = r * 2;
    for (let x = 0; x < WIDTH; x++) {
      const split = withSplitters && x % 10 === 5;
      cmds.push({ type: 'build', building: split ? 'splitter' : 'belt', x, y, dir: x === WIDTH - 1 ? 2 : 1 });
      cmds.push({ type: 'build', building: 'belt', x, y: y + 1, dir: x === 0 ? 0 : 3 });
    }
  }
  tick(state, cmds);
  for (const b of Object.values(state.buildings)) {
    if (b.type === 'splitter') continue;
    b.belt = CELL_POSITIONS.map((pos) => ({ item: 'ironOre', pos }));
  }
  return state;
}

/** Все предметы на конвейерах как набор «клетка:позиция». */
function snapshot(state: SimState): Set<string> {
  const keys = new Set<string>();
  for (const b of Object.values(state.buildings)) for (const it of b.belt ?? []) keys.add(`${b.id}:${it.pos}`);
  return keys;
}

/** Доля предметов, сдвинувшихся за один тик: предмет стоял, если его «клетка:позиция» осталась занятой. */
function movingShare(state: SimState): number {
  const before = snapshot(state);
  tick(state, []);
  const after = snapshot(state);
  let moved = 0;
  for (const key of before) if (!after.has(key)) moved++;
  return moved / before.size;
}

/** Число попыток замера: повтор спасает от всплеска внешней нагрузки (TASK-68). */
const ATTEMPTS = 3;

/** Пауза перед повтором, мс: соседняя нагрузка идёт волнами, и попытки вплотную друг к другу ловят одну и ту же волну. */
const RETRY_PAUSE_MS = 1000;

/** Пауза без DOM- и node-типов: в sim их нет. */
const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => (globalThis as unknown as { setTimeout(f: () => void, ms: number): void }).setTimeout(resolve, ms));

/** Один замер: минимум по пачкам тиков, мс на тик. Минимум устойчив к соседним воркерам, показывает собственную цену тика. */
function measure(state: SimState): number {
  const samples: number[] = [];
  for (let batch = 0; batch < 15; batch++) {
    const t0 = now();
    for (let i = 0; i < 20; i++) tick(state, []);
    samples.push((now() - t0) / 20);
  }
  return Math.min(...samples);
}

describe.each([false, true])('бенчмарк конвейеров, разделители: %s', (withSplitters) => {
  const budget = withSplitters ? BUDGET_SPLIT_MS : BUDGET_MS;
  it(`${CELLS} загруженных клеток с движущимися предметами укладываются в ${budget} мс на тик`, async () => {
    const state = factory(withSplitters);
    expect(Object.keys(state.buildings).length).toBeGreaterThanOrEqual(CELLS);
    for (let i = 0; i < 50; i++) tick(state, []);
    // Без этой проверки бенчмарк мог бы мерить стоящий завод (так было до TASK-40).
    expect(movingShare(state)).toBeGreaterThan(0.5);
    // Под внешней нагрузкой всё окно замера (~1,5 с) может оказаться медленным, поэтому весь замер повторяется
    // до ATTEMPTS раз: тест проходит, если хотя бы одна попытка уложилась в бюджет. Порог при этом прежний,
    // реальный откат скорости медленнее бюджета в каждой попытке и всё равно падает.
    const results: number[] = [];
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt > 0) await pause(RETRY_PAUSE_MS);
      results.push(measure(state));
      if (results[attempt] < budget) break;
    }
    const times = results.map((ms) => `${ms.toFixed(2)} мс`).join(', ');
    expect(Math.min(...results), `бюджет ${budget} мс, попытки: ${times}`).toBeLessThan(budget);
  }, 60_000);
});
