import type { BuildingDef } from '@factory/content';
import { buildingAt, footprintSize, type BuildingDefs, type PlacedBuilding } from './buildings';
import { cellIndex, type Deposit, type GameMap } from './grid';
import type { SimState } from './state';
import { electricTick } from './power';
import { accept, canAccept } from './transfer';

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
 * Клетка выдачи: первая клетка вдоль переднего края отпечатка, считая от левого
 * верхнего угла. N: (x, y-1); E: (x+w, y); S: (x, y+h); W: (x-1, y).
 */
function frontCell(b: PlacedBuilding, def: BuildingDef): [number, number] {
  const [w, h] = footprintSize(def.size, b.dir);
  switch (b.dir) {
    case 0:
      return [b.x, b.y - 1];
    case 1:
      return [b.x + w, b.y];
    case 2:
      return [b.x, b.y + h];
    default:
      return [b.x - 1, b.y];
  }
}

/** Выкладывает не больше одной единицы из буфера в здание перед буром, если оно принимает. */
function emit(state: SimState, b: PlacedBuilding, def: BuildingDef, defs: BuildingDefs): void {
  if (!b.output) return;
  const to = buildingAt(state, ...frontCell(b, def));
  if (!to || !canAccept(to, b.output.item, defs)) return;
  accept(to, b.output.item, defs);
  b.output.count -= 1;
  if (b.output.count <= 0) b.output = null;
}

/**
 * Поведение miner: раз в miningTicks тиков переносит единицу руды из залежи
 * в выходной буфер, затем выкладывает не больше одной единицы в клетку перед
 * собой (см. emit). Без залежи или с полным буфером цикл добычи не идёт (и энергию не берёт).
 * Выдача из буфера энергии не требует.
 */
export function runMiner(
  state: SimState,
  b: PlacedBuilding,
  def: BuildingDef,
  defs: BuildingDefs,
  satisfaction: number | undefined,
): void {
  mine(state.map, b, def, satisfaction);
  emit(state, b, def, defs);
}

function mine(map: GameMap, b: PlacedBuilding, def: BuildingDef, satisfaction: number | undefined): void {
  const ticks = def.miningTicks ?? 0;
  if (ticks <= 0) return;
  const at = depositUnder(map, b, def);
  if (at < 0) return;
  const deposit = map.deposits[at] as Deposit;
  if (!canStore(b, deposit.item, def.buffer ?? 0)) return;
  // Шаг добычи идёт со скоростью × удовлетворённость сети; вне сети бур стоит.
  if (def.energy?.kind === 'electric' && !electricTick(b, satisfaction)) return;
  b.progress += 1;
  if (b.progress < ticks) return;
  b.progress = 0;
  if (b.output) b.output.count += 1;
  else b.output = { item: deposit.item, count: 1 };
  deposit.amount -= 1;
  if (deposit.amount <= 0) map.deposits[at] = null;
}
