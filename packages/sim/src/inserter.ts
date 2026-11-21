import type { BuildingDef } from '@factory/content';
import { buildingAt, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import type { SimState } from './state';
import { electricTick, hasPower } from './power';
import { accept, canAccept, takeFrom } from './transfer';

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/**
 * Поведение inserter: берёт предмет из клетки позади (против dir) и кладёт в клетку
 * впереди (по dir). Рука (output) вмещает один предмет; перенос занимает swingTicks.
 * Если цель не принимает, манипулятор ждёт с предметом в руке.
 */
export function runInserter(
  state: SimState,
  b: PlacedBuilding,
  def: BuildingDef,
  defs: BuildingDefs,
  satisfaction: number | undefined,
): void {
  const dir: Dir = b.dir;
  const open = state.research.unlocked;
  const electric = def.energy?.kind === 'electric';
  const from = buildingAt(state, b.x - DX[dir], b.y - DY[dir]);
  const to = buildingAt(state, b.x + DX[dir], b.y + DY[dir]);
  if (!b.output) {
    if (!from || !to || from === to) return;
    if (electric && !hasPower(b, satisfaction)) return;
    const item = takeFrom(from, (it) => canAccept(to, it, defs, open), defs);
    if (item === null) return;
    b.output = { item, count: 1 };
    b.progress = 0;
    return;
  }
  const swing = def.swingTicks ?? 0;
  // Взмах идёт со скоростью × удовлетворённость; ожидание с завершённым взмахом — простой, без спроса.
  if (b.progress < swing && (!electric || electricTick(b, satisfaction))) b.progress += 1;
  if (b.progress < swing || !to || !canAccept(to, b.output.item, defs, open)) return;
  accept(to, b.output.item, defs, open);
  b.output = null;
  b.progress = 0;
}
