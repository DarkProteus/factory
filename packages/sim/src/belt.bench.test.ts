import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP, createState, tick, type Command, type SimState } from './index';
import { give } from './testKit';

// Таймер без DOM- и node-типов: в sim их нет.
const now = (): number => (globalThis as unknown as { performance: { now(): number } }).performance.now();

const ROWS = 50;
const WIDTH = 200;
/** Бюджет тика для 10 000 конвейеров, мс (решение в TASK-15; до сегментов было ~12). */
const BUDGET_MS = 5;
/**
 * Бюджет завода с разделителями (TASK-29). Здесь предметы после прогрева едут (~15 600 из ~42 000 за тик),
 * а без разделителей все ряды стоят в заторе, поэтому тик дороже: ~5 мс. Бенчмарки идут отдельным шагом pnpm test, без соседних воркеров.
 */
const BUDGET_SPLIT_MS = 8;

/**
 * Завод из ROWS × WIDTH клеток, каждый конвейер заполнен предметами до упора.
 * С withSplitters в чётных рядах каждая десятая клетка — разделитель, боковые выходы вливаются в соседние нечётные ряды (TASK-29).
 */
function factory(withSplitters = false): SimState {
  const state = give(createState(1, { width: WIDTH, height: ROWS * 2 }), 'belt', ROWS * WIDTH * 2);
  give(state, 'splitter', ROWS * WIDTH);
  const cmds: Command[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = r * 2;
    for (let x = 0; x < WIDTH; x++) {
      const split = withSplitters && r % 2 === 0 && x % 10 === 5;
      cmds.push({ type: 'build', building: split ? 'splitter' : 'belt', x, y, dir: 1 });
      if (split) cmds.push({ type: 'build', building: 'belt', x, y: y - 1, dir: 0 }, { type: 'build', building: 'belt', x, y: y + 1, dir: 2 });
    }
  }
  tick(state, cmds);
  for (const b of Object.values(state.buildings)) {
    if (b.type === 'splitter') continue;
    b.belt = [];
    for (let pos = BELT_CELL - BELT_GAP; pos >= 0; pos -= BELT_GAP) b.belt.push({ item: 'ironOre', pos });
  }
  return state;
}

describe.each([false, true])('бенчмарк конвейеров, разделители: %s', (withSplitters) => {
  const budget = withSplitters ? BUDGET_SPLIT_MS : BUDGET_MS;
  it(`${ROWS * WIDTH} загруженных клеток укладываются в ${budget} мс на тик`, () => {
    const state = factory(withSplitters);
    const count = Object.keys(state.buildings).length;
    expect(withSplitters ? count > ROWS * WIDTH : count === ROWS * WIDTH).toBe(true);
    for (let i = 0; i < 50; i++) tick(state, []);
    const samples: number[] = [];
    for (let batch = 0; batch < 9; batch++) {
      const t0 = now();
      for (let i = 0; i < 20; i++) tick(state, []);
      samples.push((now() - t0) / 20);
    }
    // Минимум по пачкам: устойчив к соседним воркерам тестов, показывает собственную цену тика.
    expect(Math.min(...samples)).toBeLessThan(budget);
  }, 60_000);
});
