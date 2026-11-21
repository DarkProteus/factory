import type { BuildingDef } from '@factory/content';
import { buildingAt, topologyVersion, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import { DX, DY, isBelt, moveBelt } from './belt';
import { feedsSplitter, runSplitter, splitterOutputs } from './splitter';
import type { SimState } from './state';
import { acceptsBeltFrom, isUnderground, laneLength, partnerOf } from './underground';

/** Шаг обхода: конвейер (target) или разделитель (outs). */
interface Step {
  b: PlacedBuilding;
  def: BuildingDef;
  /** Конвейер: клетка, куда он передаёт предметы (конвейер или разделитель), иначе null. */
  target: PlacedBuilding | null;
  /** Цель конвейера — разделитель. */
  intoSplitter: boolean;
  /** Разделитель: выходы вперёд, влево, вправо; у конвейера null. */
  outs: (PlacedBuilding | null)[] | null;
  /** Длина ленты: у входа подземного с парой — вместе с тоннелем. */
  length: number;
}

/** Сегменты, выведенные из зданий: порядок обхода с готовыми целями (TASK-15, TASK-29). */
interface Segments {
  version: number;
  defs: BuildingDefs;
  steps: Step[];
}

const segmentsCache = new WeakMap<SimState, Segments>();

const isSplitter = (b: PlacedBuilding, defs: BuildingDefs): boolean => defs[b.type]?.behavior === 'splitter';

/**
 * Куда конвейер передаёт предметы: конвейер впереди, не смотрящий навстречу, разделитель или вход
 * подземного, к которым лента подходит сзади. Вход подземного отдаёт выходу своей пары.
 */
function targetOf(state: SimState, b: PlacedBuilding, defs: BuildingDefs): PlacedBuilding | null {
  if (b.underground === 'in' && isUnderground(b, defs)) return partnerOf(state, b, defs);
  const next = buildingAt(state, b.x + DX[b.dir], b.y + DY[b.dir]);
  if (next === null || next === b) return null;
  if (isSplitter(next, defs)) return feedsSplitter(b, next) ? next : null;
  if (isUnderground(next, defs)) return acceptsBeltFrom(next, b) ? next : null;
  if (!isBelt(next, defs)) return null;
  return next.dir === (((b.dir + 2) % 4) as Dir) ? null : next;
}

/**
 * Порядок обработки: каждый узел после всех своих целей (низ по течению раньше).
 * Обход в глубину от меньшего id; в кольце порядок начинается с точки входа.
 */
function order(nodes: PlacedBuilding[], next: Map<number, PlacedBuilding[]>): PlacedBuilding[] {
  const seen = new Set<number>();
  const result: PlacedBuilding[] = [];
  for (const start of nodes) {
    if (seen.has(start.id)) continue;
    seen.add(start.id);
    const stack: [PlacedBuilding, number][] = [[start, 0]];
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const succ = next.get(top[0].id)!;
      if (top[1] < succ.length) {
        const m = succ[top[1]++]!;
        if (!seen.has(m.id)) {
          seen.add(m.id);
          stack.push([m, 0]);
        }
      } else {
        stack.pop();
        result.push(top[0]);
      }
    }
  }
  return result;
}

/** Порядок обхода и цели; пересчитываются только при стройке, сносе или смене defs. */
function segments(state: SimState, defs: BuildingDefs): Step[] {
  const version = topologyVersion(state);
  const cached = segmentsCache.get(state);
  if (cached && cached.version === version && cached.defs === defs) return cached.steps;
  const nodes = Object.values(state.buildings).filter((b) => isBelt(b, defs) || isSplitter(b, defs) || isUnderground(b, defs));
  const targets = new Map<number, PlacedBuilding | null>();
  const outs = new Map<number, (PlacedBuilding | null)[]>();
  const next = new Map<number, PlacedBuilding[]>();
  for (const b of nodes) {
    if (isSplitter(b, defs)) {
      const o = splitterOutputs(state, b, defs);
      outs.set(b.id, o);
      next.set(b.id, o.filter((x): x is PlacedBuilding => x !== null));
    } else {
      const t = targetOf(state, b, defs);
      targets.set(b.id, t);
      next.set(b.id, t ? [t] : []);
    }
  }
  const steps = order(nodes, next).map((b): Step => {
    const target = targets.get(b.id) ?? null;
    const intoSplitter = target !== null && isSplitter(target, defs);
    return { b, def: defs[b.type]!, target, intoSplitter, outs: outs.get(b.id) ?? null, length: laneLength(state, b, defs) };
  });
  segmentsCache.set(state, { version, defs, steps });
  return steps;
}

/** Поведения belt и splitter: двигает предметы конвейеров, передаёт их дальше и раздаёт из разделителей. */
export function runBelts(state: SimState, defs: BuildingDefs): void {
  for (const s of segments(state, defs)) {
    if (s.outs) runSplitter(s.b, s.outs);
    else moveBelt(s.b, s.def, s.target, s.intoSplitter, s.length);
  }
}
