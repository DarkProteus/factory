import { INVENTORY_SLOTS, MINING_TICKS } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { createState, depositAt, hash, tick, type SimState } from './index';

const T = MINING_TICKS;

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function field(amount = 100): SimState {
  return createState(1, { width: 8, height: 8, deposits: [{ x: 2, y: 2, item: 'ironOre', amount }] });
}

const ore = (s: SimState): number => s.inventory.find((x) => x.item === 'ironOre')?.count ?? 0;

describe('ручная добыча', () => {
  it('по умолчанию добычи нет', () => {
    expect(createState(1).mining).toBeNull();
  });

  it('раз в MINING_TICKS тиков одна руда уходит в инвентарь, запас залежи убывает', () => {
    const s = field();
    // Тик с командой уже засчитан как первый тик цикла.
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, T - 2);
    expect(ore(s)).toBe(0);
    run(s, 1);
    expect(ore(s)).toBe(1);
    expect(depositAt(s, 2, 2)?.amount).toBe(99);
    run(s, T);
    expect(ore(s)).toBe(2);
    expect(depositAt(s, 2, 2)?.amount).toBe(98);
    run(s, T - 1);
    expect(ore(s)).toBe(2);
  });

  it('stopMining останавливает добычу и сбрасывает прогресс', () => {
    const s = field();
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, T - 5);
    tick(s, [{ type: 'stopMining' }]);
    expect(s.mining).toBeNull();
    run(s, 3 * T);
    expect(ore(s)).toBe(0);
    expect(depositAt(s, 2, 2)?.amount).toBe(100);
    // После повторного старта цикл идёт с нуля.
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, T - 2);
    expect(ore(s)).toBe(0);
    run(s, 1);
    expect(ore(s)).toBe(1);
  });

  it('повторный startMining на той же клетке не сбрасывает прогресс, на другой — сбрасывает', () => {
    const s = field();
    s.map.deposits[3 * 8 + 3] = { item: 'ironOre', amount: 10, initial: 10 };
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, T - 3);
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, 1);
    expect(ore(s)).toBe(1);
    run(s, 5);
    tick(s, [{ type: 'startMining', x: 3, y: 3 }]);
    run(s, T - 2);
    expect(ore(s)).toBe(1);
    run(s, 1);
    expect(ore(s)).toBe(2);
    expect(depositAt(s, 3, 3)?.amount).toBe(9);
  });

  it('пустая клетка и клетка вне карты ничего не дают', () => {
    const s = field();
    tick(s, [{ type: 'startMining', x: 5, y: 5 }]);
    run(s, 3 * T);
    expect(s.inventory).toEqual([]);
    tick(s, [{ type: 'startMining', x: -1, y: 99 }]);
    run(s, 3 * T);
    expect(s.inventory).toEqual([]);
  });

  it('выработанная залежь становится null, дальше добыча ничего не даёт', () => {
    const s = field(2);
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, 5 * T);
    expect(ore(s)).toBe(2);
    expect(depositAt(s, 2, 2)).toBeNull();
  });

  it('при полном инвентаре руда не берётся и из залежи не уходит', () => {
    const s = field();
    s.inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'ironPlate', count: 1 }));
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, 3 * T);
    expect(ore(s)).toBe(0);
    expect(depositAt(s, 2, 2)?.amount).toBe(100);
    expect(s.inventory.length).toBe(INVENTORY_SLOTS);
  });

  it('после освобождения места добыча продолжается', () => {
    const s = field();
    s.inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'ironPlate', count: 1 }));
    tick(s, [{ type: 'startMining', x: 2, y: 2 }]);
    run(s, 2 * T);
    s.inventory.pop();
    run(s, T);
    expect(ore(s)).toBe(1);
  });

  it('состояние добычи входит в хеш', () => {
    const a = field();
    const b = field();
    expect(hash(a)).toBe(hash(b));
    tick(a, [{ type: 'startMining', x: 2, y: 2 }]);
    tick(b, []);
    expect(hash(a)).not.toBe(hash(b));
    run(a, 3);
    run(b, 3);
    tick(a, [{ type: 'stopMining' }]);
    tick(b, []);
    // После остановки прогресса нет, запас и тик совпадают.
    expect(hash(a)).toBe(hash(b));
  });
});
