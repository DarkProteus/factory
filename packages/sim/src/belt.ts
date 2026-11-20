import type { BuildingDef } from '@factory/content';
import { buildingAt, topologyVersion, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import type { SimState } from './state';

/** Длина клетки конвейера в единицах пути. */
export const BELT_CELL = 256;
/** Минимальное расстояние между соседними предметами на конвейере. */
export const BELT_GAP = 64;

/** Предмет на конвейере; pos — пройденный путь от входа в клетку, 0..BELT_CELL. */
export interface BeltItem {
  item: string;
  pos: number;
}

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/** Ряд предметов конвейера от головы к хвосту; создаётся при первом обращении. */
function lane(b: PlacedBuilding): BeltItem[] {
  return (b.belt ??= []);
}

/** Кладёт предмет в начало конвейера, если там есть зазор. */
export function pushToBelt(b: PlacedBuilding, item: string): boolean {
  const items = lane(b);
  const last = items[items.length - 1];
  if (last && last.pos < BELT_GAP) return false;
  items.push({ item, pos: 0 });
  return true;
}

const isBelt = (b: PlacedBuilding | null, defs: BuildingDefs): b is PlacedBuilding =>
  b !== null && defs[b.type]?.behavior === 'belt';

/** Конвейер в клетке по направлению b, если он не смотрит навстречу. */
function targetOf(state: SimState, b: PlacedBuilding, defs: BuildingDefs): PlacedBuilding | null {
  const next = buildingAt(state, b.x + DX[b.dir], b.y + DY[b.dir]);
  if (!isBelt(next, defs) || next === b) return null;
  return next.dir === (((b.dir + 2) % 4) as Dir) ? null : next;
}

/**
 * Порядок обработки: каждый конвейер после своей цели (низ по течению раньше).
 * Цепочки обходятся от меньшего id; в кольце порядок начинается с точки входа.
 */
function beltOrder(belts: PlacedBuilding[], targets: Map<number, PlacedBuilding | null>): PlacedBuilding[] {
  const done = new Set<number>();
  const order: PlacedBuilding[] = [];
  for (const start of belts) {
    const path: PlacedBuilding[] = [];
    const onPath = new Set<number>();
    let cur: PlacedBuilding | null = start;
    while (cur && !done.has(cur.id) && !onPath.has(cur.id)) {
      path.push(cur);
      onPath.add(cur.id);
      cur = targets.get(cur.id) ?? null;
    }
    for (let i = path.length - 1; i >= 0; i--) {
      done.add(path[i]!.id);
      order.push(path[i]!);
    }
  }
  return order;
}

function moveBelt(b: PlacedBuilding, def: BuildingDef, target: PlacedBuilding | null): void {
  const items = lane(b);
  if (items.length === 0) return;
  const speed = def.beltSpeed ?? 0;
  let limit = BELT_CELL;
  if (target) {
    const tail = lane(target)[lane(target).length - 1];
    limit += tail ? tail.pos - BELT_GAP : BELT_CELL;
  }
  for (const it of items) {
    it.pos = Math.max(it.pos, Math.min(it.pos + speed, limit));
    limit = it.pos - BELT_GAP;
  }
  if (!target) return;
  while (items.length > 0 && items[0]!.pos >= BELT_CELL) {
    const it = items.shift()!;
    lane(target).push({ item: it.item, pos: it.pos - BELT_CELL });
  }
}

/** Шаг сегмента: конвейер, его определение и цель (следующий конвейер или null). */
type Step = readonly [PlacedBuilding, BuildingDef, PlacedBuilding | null];

/** Сегменты конвейеров, выведенные из зданий: порядок обхода с готовыми целями (TASK-15). */
interface Segments {
  version: number;
  defs: BuildingDefs;
  steps: Step[];
}

const segmentsCache = new WeakMap<SimState, Segments>();

/** Порядок обхода и цели; пересчитываются только при стройке, сносе или смене defs. */
function segments(state: SimState, defs: BuildingDefs): Step[] {
  const version = topologyVersion(state);
  const cached = segmentsCache.get(state);
  if (cached && cached.version === version && cached.defs === defs) return cached.steps;
  const belts = Object.values(state.buildings).filter((b) => isBelt(b, defs));
  const targets = new Map(belts.map((b) => [b.id, targetOf(state, b, defs)] as const));
  const steps = beltOrder(belts, targets).map((b): Step => [b, defs[b.type]!, targets.get(b.id) ?? null]);
  segmentsCache.set(state, { version, defs, steps });
  return steps;
}

/** Поведение belt: двигает предметы всех конвейеров и передаёт их на следующие. */
export function runBelts(state: SimState, defs: BuildingDefs): void {
  for (const [b, def, target] of segments(state, defs)) moveBelt(b, def, target);
}
