import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import type { BuildingDefs, PlacedBuilding } from './buildings';
import { burnEnergy, burnTick, hasEnergy } from './fuel';
import { powerNetworks } from './network';
import type { SimState } from './state';

/**
 * Удовлетворённость сети — целое 0..POWER_SCALE (POWER_SCALE — полная, ×1). Дробная скорость
 * копится в b.charge: за тик прибавляется удовлетворённость, каждые POWER_SCALE дают тик работы.
 */
export const POWER_SCALE = 65536;

/** Выработка и спрос одной сети в текущем тике, кВт. */
export interface NetworkStats {
  /** Мощность генераторов, у которых есть энергия. */
  supply: number;
  /** Спрос потребителей, которые работали в прошлом тике. */
  demand: number;
  /** 0..POWER_SCALE. */
  satisfaction: number;
}

/** Итог шага энергии: удовлетворённость по id здания (нет в карте — здание вне сети) и сводка по сетям. */
export interface PowerTick {
  byBuilding: Map<number, number>;
  networks: Map<number, NetworkStats>;
}

const last = new WeakMap<SimState, PowerTick>();

/** Последний шаг энергии (для отображения); до первого тика — пусто. */
export function powerStats(state: SimState): PowerTick {
  return last.get(state) ?? { byBuilding: new Map(), networks: new Map() };
}

/**
 * Шаг энергии в начале тика. Спрос — kw потребителей с флагом draw (хотели работать в прошлом тике);
 * флаги снимаются, поведения ставят их заново. Генераторы жгут топливо на min(выработка, спрос),
 * доля каждого пропорциональна kw, остаток деления — первому по id.
 */
export function stepPower(state: SimState, defs: BuildingDefs = contentBuildings): PowerTick {
  const nets = powerNetworks(state, defs);
  const byBuilding = new Map<number, number>();
  const networks = new Map<number, NetworkStats>();
  const netIds = new Set([...nets.consumers.keys(), ...nets.generators.keys()]);
  for (const net of [...netIds].sort((a, b) => a - b)) {
    const live = (nets.generators.get(net) ?? []).map((id) => state.buildings[id]!).filter(hasEnergy);
    const supply = live.reduce((sum, g) => sum + kw(g, defs), 0);
    let demand = 0;
    for (const id of nets.consumers.get(net) ?? []) {
      const b = state.buildings[id]!;
      if (b.draw) demand += kw(b, defs);
      delete b.draw;
    }
    const satisfaction = demand === 0 ? (supply > 0 ? POWER_SCALE : 0) : Math.min(POWER_SCALE, Math.floor((supply * POWER_SCALE) / demand));
    burnGenerators(live, Math.min(supply, demand) * 1000, supply, defs);
    networks.set(net, { supply, demand, satisfaction });
    for (const id of nets.consumers.get(net) ?? []) byBuilding.set(id, satisfaction);
  }
  // Флаги потребителей вне сети тоже снимаются: они в спрос не входят.
  for (const b of Object.values(state.buildings)) if (b.draw && !byBuilding.has(b.id)) delete b.draw;
  const result = { byBuilding, networks };
  last.set(state, result);
  return result;
}

function kw(b: PlacedBuilding, defs: BuildingDefs): number {
  return defs[b.type]?.energy?.kw ?? 0;
}

function burnGenerators(live: PlacedBuilding[], delivered: number, supply: number, defs: BuildingDefs): void {
  if (delivered === 0) return;
  const shares = live.map((g) => Math.floor((delivered * kw(g, defs)) / supply));
  shares[0]! += delivered - shares.reduce((a, b) => a + b, 0);
  live.forEach((g, i) => burnEnergy(g, shares[i]!));
}

/**
 * Тик работы электрического здания: отмечает спрос (draw) и копит удовлетворённость в b.charge.
 * true — прогресс растёт на 1 в этом тике. Вне сети (satisfaction undefined) — false, без спроса.
 */
export function electricTick(b: PlacedBuilding, satisfaction: number | undefined): boolean {
  if (satisfaction === undefined) return false;
  b.draw = true;
  let charge = (b.charge ?? 0) + satisfaction;
  const ok = charge >= POWER_SCALE;
  if (ok) charge -= POWER_SCALE;
  if (charge > 0) b.charge = charge;
  else delete b.charge;
  return ok;
}

/** Есть ли у электрического здания хоть какая-то энергия (для мгновенных действий: захват манипулятора). */
export function hasPower(b: PlacedBuilding, satisfaction: number | undefined): boolean {
  if (satisfaction === undefined) return false;
  b.draw = true;
  return satisfaction > 0;
}

/** Тик работы здания любого вида энергии: топливо (fuel.ts), сеть или без энергии. */
export function energyTick(b: PlacedBuilding, def: BuildingDef, satisfaction: number | undefined): boolean {
  switch (def.energy?.kind) {
    case 'fuel':
      return burnTick(b, def);
    case 'electric':
      return electricTick(b, satisfaction);
    default:
      return true;
  }
}
