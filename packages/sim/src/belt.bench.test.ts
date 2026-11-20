import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP, createState, tick, type Command, type SimState } from './index';
import { give } from './testKit';

// Таймер без DOM- и node-типов: в sim их нет.
const now = (): number => (globalThis as unknown as { performance: { now(): number } }).performance.now();

const ROWS = 50;
const WIDTH = 200;
/** Бюджет тика для 10 000 конвейеров, мс (решение в TASK-15; до сегментов было ~12). */
const BUDGET_MS = 5;

/** Завод из ROWS × WIDTH конвейеров, каждый заполнен предметами до упора. */
function factory(): SimState {
  const state = give(createState(1, { width: WIDTH, height: ROWS * 2 }), 'belt', ROWS * WIDTH);
  const cmds: Command[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let x = 0; x < WIDTH; x++) cmds.push({ type: 'build', building: 'belt', x, y: r * 2, dir: 1 });
  }
  tick(state, cmds);
  for (const b of Object.values(state.buildings)) {
    b.belt = [];
    for (let pos = BELT_CELL - BELT_GAP; pos >= 0; pos -= BELT_GAP) b.belt.push({ item: 'ironOre', pos });
  }
  return state;
}

describe('бенчмарк конвейеров', () => {
  it(`${ROWS * WIDTH} загруженных конвейеров укладываются в ${BUDGET_MS} мс на тик`, () => {
    const state = factory();
    expect(Object.keys(state.buildings)).toHaveLength(ROWS * WIDTH);
    for (let i = 0; i < 50; i++) tick(state, []);
    const samples: number[] = [];
    for (let batch = 0; batch < 9; batch++) {
      const t0 = now();
      for (let i = 0; i < 20; i++) tick(state, []);
      samples.push((now() - t0) / 20);
    }
    // Минимум по пачкам: устойчив к соседним воркерам тестов, показывает собственную цену тика.
    expect(Math.min(...samples)).toBeLessThan(BUDGET_MS);
  }, 60_000);
});
