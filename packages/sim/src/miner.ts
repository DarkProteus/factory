import type { BuildingDef } from '@factory/content';
import { footprintSize, type PlacedBuilding } from './buildings';
import { cellIndex, type Deposit, type GameMap } from './grid';

/** Первая непустая залежь под отпечатком бура, по строкам сверху вниз и слева направо. */
function depositUnder(map: GameMap, b: PlacedBuilding, def: BuildingDef): number {
  const [w, h] = footprintSize(def.size, b.dir);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const i = cellIndex(map, b.x + dx, b.y + dy);
      if (map.deposits[i]) return i;
    }
  }
  return -1;
}

function canStore(b: PlacedBuilding, item: string, capacity: number): boolean {
  if (!b.output) return capacity > 0;
  return b.output.item === item && b.output.count < capacity;
}

/**
 * Поведение miner: раз в miningTicks тиков переносит единицу руды из залежи
 * в выходной буфер. Без залежи или с полным буфером цикл не идёт.
 */
export function runMiner(map: GameMap, b: PlacedBuilding, def: BuildingDef): void {
  const ticks = def.miningTicks ?? 0;
  if (ticks <= 0) return;
  const at = depositUnder(map, b, def);
  if (at < 0) return;
  const deposit = map.deposits[at] as Deposit;
  if (!canStore(b, deposit.item, def.buffer ?? 0)) return;
  b.progress += 1;
  if (b.progress < ticks) return;
  b.progress = 0;
  if (b.output) b.output.count += 1;
  else b.output = { item: deposit.item, count: 1 };
  deposit.amount -= 1;
  if (deposit.amount <= 0) map.deposits[at] = null;
}
