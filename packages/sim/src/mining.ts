import { items, INVENTORY_SLOTS, MINING_TICKS } from '@factory/content';
import { cellIndex, inBounds, type Deposit } from './grid';
import { add, canAdd } from './inventory';
import type { SimState } from './state';

/**
 * Начинает ручную добычу на клетке. Клетка вне карты игнорируется.
 * Повтор на той же клетке прогресс не сбрасывает, другая клетка начинает цикл заново.
 */
export function startMining(state: SimState, x: number, y: number): void {
  if (!inBounds(state.map, x, y)) return;
  if (state.mining && state.mining.x === x && state.mining.y === y) return;
  state.mining = { x, y, progress: 0 };
}

/** Прекращает добычу; прогресс цикла не сохраняется. */
export function stopMining(state: SimState): void {
  state.mining = null;
}

/**
 * Один тик ручной добычи: раз в MINING_TICKS тиков одна руда залежи уходит
 * в инвентарь. На пустой клетке и при полном инвентаре прогресс не копится.
 * Выработанная залежь становится null, как у бура.
 */
export function runMining(state: SimState): void {
  const m = state.mining;
  if (!m) return;
  const i = cellIndex(state.map, m.x, m.y);
  const deposit: Deposit | null = state.map.deposits[i] ?? null;
  if (!deposit || !canAdd(state.inventory, INVENTORY_SLOTS, deposit.item, items)) {
    m.progress = 0;
    return;
  }
  m.progress += 1;
  if (m.progress < MINING_TICKS) return;
  m.progress = 0;
  add(state.inventory, INVENTORY_SLOTS, deposit.item, items);
  deposit.amount -= 1;
  if (deposit.amount <= 0) state.map.deposits[i] = null;
}
