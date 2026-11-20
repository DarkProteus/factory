import type { ItemStack, PlacedBuilding } from './buildings';
import { createMap, type GameMap, type MapParams } from './grid';

/** Состояние симуляции: только простые данные, сериализуется в JSON без потерь. */
export interface SimState {
  /** Номер текущего тика; растёт на 1 за шаг. */
  tick: number;
  /** Состояние генератора случайных чисел (см. rng.ts). */
  rng: number;
  /** Служебные счётчики, которые меняют команды setCounter и rollCounter. */
  counters: Record<string, number>;
  /** Тайловая карта: земля, залежи, занятость клеток. */
  map: GameMap;
  /** Поставленные здания по id; числовые ключи обходятся по возрастанию. */
  buildings: Record<number, PlacedBuilding>;
  /** id для следующего здания; начинается с 1. */
  nextId: number;
  /** Инвентарь игрока: ячейки (непустые стеки), см. inventory.ts; не длиннее INVENTORY_SLOTS. */
  inventory: ItemStack[];
}

export function createState(seed: number, map?: MapParams): SimState {
  return { tick: 0, rng: seed | 0, counters: {}, map: createMap(map), buildings: {}, nextId: 1, inventory: [] };
}
