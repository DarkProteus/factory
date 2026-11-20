import type { BuildingDef } from '@factory/content';
import { buildingAt, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import type { SimState } from './state';
import { accept, canAccept, takeFrom } from './transfer';

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/**
 * Поведение inserter: берёт предмет из клетки позади (против dir) и кладёт в клетку
 * впереди (по dir). Рука (output) вмещает один предмет; перенос занимает swingTicks.
 * Если цель не принимает, манипулятор ждёт с предметом в руке.
 */
export function runInserter(state: SimState, b: PlacedBuilding, def: BuildingDef, defs: BuildingDefs): void {
  const dir: Dir = b.dir;
  const from = buildingAt(state, b.x - DX[dir], b.y - DY[dir]);
  const to = buildingAt(state, b.x + DX[dir], b.y + DY[dir]);
  if (!b.output) {
    if (!from || !to || from === to) return;
    const item = takeFrom(from, (it) => canAccept(to, it, defs), defs);
    if (item === null) return;
    b.output = { item, count: 1 };
    b.progress = 0;
    return;
  }
  b.progress = Math.min(b.progress + 1, def.swingTicks ?? 0);
  if (b.progress < (def.swingTicks ?? 0) || !to || !canAccept(to, b.output.item, defs)) return;
  accept(to, b.output.item, defs);
  b.output = null;
  b.progress = 0;
}
