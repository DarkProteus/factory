import type { ItemStack, PlacedBuilding } from './buildings';
import type { CraftJob } from './craftQueue';
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
  /** Ручная добыча: клетка залежи и прогресс текущего цикла в тиках; null, если игрок не добывает. */
  mining: MiningState | null;
  /** Очередь ручного крафта игрока, см. craftQueue.ts; выполняется первая запись. */
  craftQueue: CraftJob[];
}

/** Состояние ручной добычи (см. mining.ts). */
export interface MiningState {
  x: number;
  y: number;
  /** Тиков текущего цикла; при достижении MINING_TICKS руда уходит в инвентарь. */
  progress: number;
}

export function createState(seed: number, map?: MapParams): SimState {
  return { tick: 0, rng: seed | 0, counters: {}, map: createMap(map), buildings: {}, nextId: 1, inventory: [], mining: null, craftQueue: [] };
}
