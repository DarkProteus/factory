// Помощник для тестов: постройка тратит предмет-здание, поэтому инвентарь надо заранее наполнить.
import { buildings, items, type BuildingDef } from '@factory/content';
import { canPlace, demolishAt, footprintSize, placeBuilding } from './buildings';
import { powerNetworks } from './network';
import type { SimState } from './state';

/** Кладёт в инвентарь по одной полной стопке предметов-зданий каждого вида (кроме `except`) и возвращает состояние. */
export function stocked(state: SimState, except: readonly string[] = []): SimState {
  for (const id of Object.keys(buildings)) {
    if (!except.includes(id)) state.inventory.push({ item: id, count: items[id as keyof typeof items].stack });
  }
  return state;
}

/** Кладёт в инвентарь `count` предметов указанного вида (в том числе для таблиц зданий вне content), без лимита стопки. */
export function give(state: SimState, item: string, count: number): SimState {
  const slot = state.inventory.find((s) => s.item === item);
  if (slot) slot.count += count;
  else state.inventory.push({ item, count });
  return state;
}

/**
 * Подключает к сети все электрические здания: рядом с каждым зданием без сети ставит столб,
 * а к сети без генератора — генератор с полной стопкой угля. Звать после раскладки:
 * столбы и генераторы занимают свободные клетки рядом. Бросает ошибку, если места нет.
 */
export function electrify(state: SimState): SimState {
  for (const b of Object.values(state.buildings)) {
    const def: BuildingDef | undefined = (buildings as Record<string, BuildingDef>)[b.type];
    if (def?.energy?.kind !== 'electric') continue;
    let net = powerNetworks(state).buildingNet.get(b.id);
    if (net === undefined) {
      const [w, h] = footprintSize(def.size, b.dir);
      net = placeNear(state, 'pole', b.x - 2, b.y - 2, b.x + w + 1, b.y + h + 1, b.id);
    }
    if ((powerNetworks(state).generators.get(net) ?? []).length > 0) continue;
    const id = placeGenerator(state, net);
    state.buildings[id]!.fuel = { item: 'coal', count: items.coal.stack };
  }
  return state;
}

/** Генератор в первую свободную клетку, где сеть net его покрывает, при нужде с ещё одним столбом рядом. */
function placeGenerator(state: SimState, net: number): number {
  const { width, height } = state.map;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!canPlace(state, 'generator', x, y, 0)) continue;
      give(state, 'generator', 1);
      placeBuilding(state, 'generator', x, y, 0);
      const id = state.nextId - 1;
      const joined = () => powerNetworks(state).buildingNet.get(id) === net;
      if (joined()) return id;
      for (let py = y - 2; py <= y + 4 && !joined(); py++) {
        for (let px = x - 2; px <= x + 4 && !joined(); px++) {
          if (!canPlace(state, 'pole', px, py, 0)) continue;
          give(state, 'pole', 1);
          placeBuilding(state, 'pole', px, py, 0);
          if (!joined()) demolishAt(state, px, py);
        }
      }
      if (joined()) return id;
      demolishAt(state, x, y);
    }
  }
  throw new Error('electrify: нет места для генератора');
}

/** Ставит здание в первую клетку прямоугольника (по строкам), где оно подключает здание forId к сети; возвращает id сети. */
function placeNear(state: SimState, type: string, x0: number, y0: number, x1: number, y1: number, forId: number): number {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!canPlace(state, type, x, y, 0)) continue;
      give(state, type, 1);
      placeBuilding(state, type, x, y, 0);
      const net = powerNetworks(state).buildingNet.get(forId);
      if (net !== undefined) return net;
      demolishAt(state, x, y);
    }
  }
  throw new Error(`electrify: нет места для ${type} около (${x0}, ${y0})`);
}
