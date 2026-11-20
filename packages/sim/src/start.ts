// Стартовая партия: карта и набор игрока берутся из content (там только данные).
import { START_KIT, startMap } from '@factory/content';
import type { ItemStack } from './buildings';
import type { MapParams } from './grid';

/** Пятна залежей из startMap, развёрнутые в клетки. */
export function startMapParams(): MapParams {
  const deposits: NonNullable<MapParams['deposits']> = [];
  for (const { item, x, y, w, h, amount } of startMap.patches) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) deposits.push({ x: x + dx, y: y + dy, item, amount });
    }
  }
  return { width: startMap.width, height: startMap.height, deposits };
}

/** Инвентарь новой партии: по одной ячейке на каждый предмет START_KIT. */
export function startInventory(): ItemStack[] {
  return Object.entries(START_KIT).map(([item, count]) => ({ item, count: count ?? 0 }));
}
