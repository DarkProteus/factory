import type { ItemId } from './items';

/** Число ячеек инвентаря игрока. */
export const INVENTORY_SLOTS = 30;

/** Стартовый набор новой партии: id предмета -> количество. */
export const START_KIT: Readonly<Partial<Record<ItemId, number>>> = {
  generator: 1,
  pole: 10,
  drill: 2,
  furnace: 2,
  inserter: 4,
  belt: 20,
  chest: 1,
  coal: 20,
};

/** Тиков на одну руду при ручной добыче. */
export const MINING_TICKS = 30;
