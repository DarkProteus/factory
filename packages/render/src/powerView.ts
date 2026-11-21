// Энергия на карте: что и где рисовать (docs/style.md, «Энергия на карте»).
// Чистая логика без Pixi: зоны, провода, значки. Данные берутся из sim (powerNetworks, powerStats),
// состояние только читается; кеш сетей в sim выведенный, не состояние.
import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { footprintSize, powerNetworks, powerStats, wireTree, type SimState } from '@factory/sim';
import type { ViewState } from './interp';
import { CELL } from './palette';

type Defs = Readonly<Record<string, BuildingDef>>;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Зона покрытия столба в клетках, обрезанная по карте. */
export function zoneRect(pole: { x: number; y: number }, coverage: number, mapW: number, mapH: number): Rect {
  const half = Math.floor(coverage / 2);
  const x0 = Math.max(0, pole.x - half);
  const y0 = Math.max(0, pole.y - half);
  const x1 = Math.min(mapW, pole.x + half + 1);
  const y1 = Math.min(mapH, pole.y + half + 1);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** Центр клетки в px. */
const center = (x: number, y: number): [number, number] => [(x + 0.5) * CELL, (y + 0.5) * CELL];

const sim = (state: ViewState): SimState => state as unknown as SimState;

/** Провода между соединёнными столбами: отрезки [x1, y1, x2, y2] в px от центра к центру. */
export function wireSegments(state: ViewState, defs: Defs = contentBuildings): [number, number, number, number][] {
  return powerNetworks(sim(state), defs).wires.map(([a, b]) => {
    const pa = state.buildings[a]!;
    const pb = state.buildings[b]!;
    return [...center(pa.x, pa.y), ...center(pb.x, pb.y)];
  });
}

/**
 * id столбов, с которыми соединится призрак столба в клетке at: рёбра призрака в остовном дереве,
 * пересчитанном вместе с ним (то же правило, что у сети). Призрак получит наибольший id.
 */
export function ghostLinks(state: ViewState, at: { x: number; y: number }, type: string, defs: Defs = contentBuildings): number[] {
  if (defs[type]?.behavior !== 'pole') return [];
  const poles = Object.values(state.buildings).filter((b) => defs[b.type]?.behavior === 'pole');
  const ghostId = poles.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const { wires } = wireTree([...poles, { id: ghostId, type, x: at.x, y: at.y }], defs);
  return wires.filter(([, b]) => b === ghostId).map(([a]) => a).sort((p, q) => p - q);
}

export type BadgeKind = 'power' | 'fuel';

export interface Badge {
  id: number;
  kind: BadgeKind;
  /** Центр значка в мире, px: середина верхнего края отпечатка, сдвиг на 6 px вверх. */
  x: number;
  y: number;
}

/** Сдвиг значка над верхним краем отпечатка, px. */
const BADGE_LIFT = 6;

/** Есть ли залежь под отпечатком (так бур выбирает, что копать). */
function hasDepositUnder(state: ViewState, x: number, y: number, w: number, h: number): boolean {
  const { map } = state;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cx = x + dx;
      const cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) continue;
      if (map.deposits[cy * map.width + cx]) return true;
    }
  }
  return false;
}

/**
 * Удовлетворённость сети здания, 0..POWER_SCALE: вне сети — 0. До первого тика данных нет (undefined),
 * тогда здание считается питаемым, чтобы лампы и значки не мигали на пустом месте.
 */
export function satisfactionOf(state: ViewState, id: number, defs: Defs = contentBuildings): number | undefined {
  if (!powerNetworks(sim(state), defs).buildingNet.has(id)) return 0;
  return powerStats(sim(state)).byBuilding.get(id);
}

/** Нагрузка генератора, 0..1: min(выработка, спрос) / выработка его сети; вне сети или без выработки — 0. */
export function generatorLoadOf(state: ViewState, id: number, defs: Defs = contentBuildings): number {
  const net = powerNetworks(sim(state), defs).buildingNet.get(id);
  const s = net === undefined ? undefined : powerStats(sim(state)).networks.get(net);
  return s && s.supply > 0 ? Math.min(s.supply, s.demand) / s.supply : 0;
}

/** Значки над зданиями: «нет энергии» и «нет топлива» по правилам style.md. */
export function badges(state: ViewState, defs: Defs = contentBuildings): Badge[] {
  const nets = powerNetworks(sim(state), defs);
  const stats = powerStats(sim(state));
  const out: Badge[] = [];
  for (const b of Object.values(state.buildings)) {
    const def = defs[b.type];
    const kind = def?.energy?.kind;
    if (!def || !kind) continue;
    const [w, h] = footprintSize(def.size, b.dir);
    let badge: BadgeKind | null = null;
    if (kind === 'electric') {
      const idle =
        (def.behavior === 'crafter' && def.recipeMode === 'chosen' && b.recipe === undefined) ||
        (def.behavior === 'miner' && !hasDepositUnder(state, b.x, b.y, w, h));
      const satisfaction = nets.buildingNet.has(b.id) ? stats.byBuilding.get(b.id) : 0;
      // До первого тика удовлетворённости ещё нет (undefined): значок не показываем.
      if (!idle && satisfaction === 0) badge = 'power';
    } else if (kind === 'fuel') {
      const cost = def.energy!.kw * 1000;
      const working = (b.input ?? []).some((s) => s.count > 0) || b.progress > 0;
      if (!b.fuel && (b.burn ?? 0) < cost && working) badge = 'fuel';
    } else {
      const net = nets.buildingNet.get(b.id);
      const loaded = net !== undefined && (nets.consumers.get(net)?.length ?? 0) > 0;
      if (!b.fuel && (b.burn ?? 0) <= 0 && loaded) badge = 'fuel';
    }
    if (badge) out.push({ id: b.id, kind: badge, x: (b.x + w / 2) * CELL, y: b.y * CELL - BADGE_LIFT });
  }
  return out;
}

/** Прозрачность мигающего значка в момент time (тики, дробные между тиками). */
export const badgeAlpha = (time: number): number => 0.775 + 0.225 * Math.sin(time * 0.15);
