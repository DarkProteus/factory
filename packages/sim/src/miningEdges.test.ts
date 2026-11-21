import { INVENTORY_SLOTS, MINING_TICKS, items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { createState, depositAt, tick, type SimState } from './index';
import { runMining, startMining, stopMining } from './mining';

const T = MINING_TICKS;

/** Карта 8×4 (не квадратная): залежь в (5,2) проверяет индекс y*width + x. */
const field = (amount = 10): SimState => createState(1, { width: 8, height: 4, deposits: [{ x: 5, y: 2, item: 'ironOre', amount }] });

const ore = (s: SimState): number => s.inventory.find((x) => x.item === 'ironOre')?.count ?? 0;

describe('ручная добыча: клетка и границы', () => {
  it('добывает с клетки (5,2) неквадратной карты', () => {
    const s = field();
    startMining(s, 5, 2);
    for (let i = 0; i < T; i++) runMining(s);
    expect(ore(s)).toBe(1);
    expect(depositAt(s, 5, 2)?.amount).toBe(9);
  });

  it('клетки вне карты (за каждым краем, дробные) команду не начинают', () => {
    const s = field();
    for (const [x, y] of [
      [8, 0],
      [0, 4],
      [-1, 0],
      [0, -1],
      [1.5, 1],
      [1, 1.5],
    ]) {
      startMining(s, x!, y!);
      expect(s.mining).toBeNull();
    }
    startMining(s, 7, 3);
    expect(s.mining).toEqual({ x: 7, y: 3, progress: 0 });
  });

  it('повтор на той же клетке прогресс не сбрасывает, другая клетка — сбрасывает (по x и по y отдельно)', () => {
    const s = field();
    startMining(s, 5, 2);
    runMining(s);
    runMining(s);
    startMining(s, 5, 2);
    expect(s.mining?.progress).toBe(2);
    startMining(s, 6, 2);
    expect(s.mining).toEqual({ x: 6, y: 2, progress: 0 });
    s.mining!.progress = 2;
    startMining(s, 6, 3);
    expect(s.mining).toEqual({ x: 6, y: 3, progress: 0 });
    s.mining!.progress = 2;
    startMining(s, 5, 3);
    expect(s.mining?.progress).toBe(0);
  });

  it('stopMining сбрасывает добычу', () => {
    const s = field();
    startMining(s, 5, 2);
    stopMining(s);
    expect(s.mining).toBeNull();
    runMining(s);
    expect(s.mining).toBeNull();
  });
});

describe('ручная добыча: цикл', () => {
  it('единица выдаётся ровно на MINING_TICKS-м тике, прогресс сбрасывается', () => {
    const s = field();
    startMining(s, 5, 2);
    for (let i = 0; i < T - 1; i++) runMining(s);
    expect(ore(s)).toBe(0);
    expect(s.mining?.progress).toBe(T - 1);
    runMining(s);
    expect(ore(s)).toBe(1);
    expect(s.mining?.progress).toBe(0);
  });

  it('пустая клетка и вышедшая залежь: прогресс не копится', () => {
    const s = field();
    startMining(s, 0, 0);
    runMining(s);
    expect(s.mining?.progress).toBe(0);
    startMining(s, 5, 2);
    for (let i = 0; i < 5; i++) runMining(s);
    expect(s.mining?.progress).toBe(5);
    s.map.deposits.fill(null);
    runMining(s);
    expect(s.mining?.progress).toBe(0);
  });

  it('последняя единица убирает залежь, мёртвая клетка дальше ничего не даёт', () => {
    const s = field(1);
    startMining(s, 5, 2);
    for (let i = 0; i < T; i++) runMining(s);
    expect(ore(s)).toBe(1);
    expect(s.map.deposits[2 * 8 + 5]).toBeNull();
    for (let i = 0; i < T * 2; i++) runMining(s);
    expect(ore(s)).toBe(1);
  });

  it('полный инвентарь: прогресс не копится, залежь не тратится', () => {
    const s = field();
    for (let i = 0; i < INVENTORY_SLOTS; i++) s.inventory.push({ item: 'coal', count: items.coal.stack });
    startMining(s, 5, 2);
    for (let i = 0; i < T * 2; i++) runMining(s);
    expect(s.mining?.progress).toBe(0);
    expect(depositAt(s, 5, 2)?.amount).toBe(10);
  });

  it('через tick: команда startMining засчитывается как первый тик цикла', () => {
    const s = field();
    tick(s, [{ type: 'startMining', x: 5, y: 2 }]);
    expect(s.mining?.progress).toBe(1);
  });
});
