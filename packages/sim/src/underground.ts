import { buildings as contentBuildings } from '@factory/content';
import { BELT_CELL, DX, DY, type BeltItem } from './belt';
import { buildingAt, topologyVersion, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';

/**
 * Подземный конвейер (TASK-36). Роль ('in' | 'out') хранится в здании и задаётся при постановке,
 * пара выводится из расстановки и кешируется по topologyVersion. Тоннель — продолжение ленты входа:
 * при паре её длина BELT_CELL × расстояние до выхода, предметы с pos > BELT_CELL — под землёй.
 */

type UndergroundState = Parameters<typeof buildingAt>[0];

export const isUnderground = (b: PlacedBuilding | null, defs: BuildingDefs): boolean =>
  b !== null && defs[b.type]?.behavior === 'underground';

/** Дальность в клетках между входом и выходом. */
const reachOf = (type: string, defs: BuildingDefs): number => defs[type]?.undergroundReach ?? 0;

/**
 * Ближайший подземный того же типа и направления на луче от (x, y): step = +1 вперёд, −1 назад,
 * не дальше reach + 1 клеток. Возвращает здание и расстояние в клетках.
 */
function nearest(
  state: UndergroundState,
  type: string,
  x: number,
  y: number,
  dir: Dir,
  step: 1 | -1,
  defs: BuildingDefs,
): { b: PlacedBuilding; dist: number } | null {
  const reach = reachOf(type, defs);
  for (let k = 1; k <= reach + 1; k++) {
    const b = buildingAt(state, x + DX[dir] * k * step, y + DY[dir] * k * step);
    if (b && b.type === type && b.dir === dir && isUnderground(b, defs)) return { b, dist: k };
  }
  return null;
}

/** Пары вход ↔ выход: id -> { партнёр, расстояние }. Кеш по topologyVersion и defs. */
interface Pairs {
  version: number;
  defs: BuildingDefs;
  map: Map<number, { partner: PlacedBuilding; dist: number }>;
}

const pairsCache = new WeakMap<object, Pairs>();

function pairs(state: UndergroundState, defs: BuildingDefs): Pairs['map'] {
  const version = topologyVersion(state);
  const cached = pairsCache.get(state);
  if (cached && cached.version === version && cached.defs === defs) return cached.map;
  const map: Pairs['map'] = new Map();
  for (const b of Object.values(state.buildings)) {
    if (b.underground !== 'in' || !isUnderground(b, defs)) continue;
    const ahead = nearest(state, b.type, b.x, b.y, b.dir, 1, defs);
    if (!ahead || ahead.b.underground !== 'out') continue;
    const back = nearest(state, b.type, ahead.b.x, ahead.b.y, b.dir, -1, defs);
    if (back?.b !== b) continue;
    map.set(b.id, { partner: ahead.b, dist: ahead.dist });
    map.set(ahead.b.id, { partner: b, dist: ahead.dist });
  }
  pairsCache.set(state, { version, defs, map });
  return map;
}

/** Партнёр подземного по паре или null. */
export function partnerOf(state: UndergroundState, b: PlacedBuilding, defs: BuildingDefs): PlacedBuilding | null {
  return pairs(state, defs).get(b.id)?.partner ?? null;
}

/** Длина ленты здания: у входа с парой — вместе с тоннелем, у остальных — одна клетка. */
export function laneLength(state: UndergroundState, b: PlacedBuilding, defs: BuildingDefs): number {
  if (b.underground !== 'in') return BELT_CELL;
  return BELT_CELL * (pairs(state, defs).get(b.id)?.dist ?? 1);
}

/**
 * Роль, которую получит подземный, поставленный в (x, y): выход, если позади ближайший
 * того же типа и направления — вход без пары; иначе вход. Нужна постановке и призраку.
 */
export function undergroundPlacement(
  state: UndergroundState,
  type: string,
  x: number,
  y: number,
  dir: Dir,
  defs: BuildingDefs = contentBuildings,
): { role: 'in' | 'out'; partner: number | null } {
  const back = nearest(state, type, x, y, dir, -1, defs);
  if (back && back.b.underground === 'in' && !pairs(state, defs).has(back.b.id)) return { role: 'out', partner: back.b.id };
  return { role: 'in', partner: null };
}

/** Лежит ли клетка внутри пролёта пары того же типа и направления (туда такой подземный ставить нельзя). */
export function insideSpan(state: UndergroundState, type: string, x: number, y: number, dir: Dir, defs: BuildingDefs): boolean {
  const back = nearest(state, type, x, y, dir, -1, defs);
  if (!back || back.b.underground !== 'in') return false;
  const pair = pairs(state, defs).get(back.b.id);
  return pair !== undefined && pair.dist > back.dist;
}

/** Принимает ли подземный ленту от здания from, стоящего за его клеткой: вход — только сзади, выход — никогда. */
export const acceptsBeltFrom = (u: PlacedBuilding, from: PlacedBuilding): boolean => u.underground === 'in' && u.dir === from.dir;

/** Предметы тоннеля, которые уходят в инвентарь вместе с выходом при его сносе (лента входа за первой клеткой). */
export function tunnelItems(state: UndergroundState, b: PlacedBuilding, defs: BuildingDefs): { from: PlacedBuilding; items: BeltItem[] } | null {
  if (b.underground !== 'out' || !isUnderground(b, defs)) return null;
  const from = partnerOf(state, b, defs);
  if (!from) return null;
  return { from, items: (from.belt ?? []).filter((it) => it.pos > BELT_CELL) };
}
