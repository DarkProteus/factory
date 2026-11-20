// Помощник для тестов: постройка тратит предмет-здание, поэтому инвентарь надо заранее наполнить.
import { buildings, items } from '@factory/content';
import type { SimState } from './state';

/** Кладёт в инвентарь по одной полной стопке предметов-зданий каждого вида (кроме `except`) и возвращает состояние. */
export function stocked(state: SimState, except: readonly string[] = []): SimState {
  for (const id of Object.keys(buildings)) {
    if (!except.includes(id)) state.inventory.push({ item: id, count: items[id as keyof typeof items].stack });
  }
  return state;
}

/** Кладёт в инвентарь `count` предметов указанного вида (в том числе для таблиц зданий вне content), без лимита стопки. */
export function give(state: SimState, item: string, count: number): SimState {
  const slot = state.inventory.find((s) => s.item === item);
  if (slot) slot.count += count;
  else state.inventory.push({ item, count });
  return state;
}
