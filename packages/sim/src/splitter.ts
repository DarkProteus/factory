import { buildings as contentBuildings, items } from '@factory/content';
import { buildingAt, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import { DX, DY, isBelt, pushToBelt } from './belt';
import type { SimState } from './state';

/** Принимает ли разделитель предметы с конвейера: только сзади, то есть лента смотрит туда же, что и он. */
export function feedsSplitter(belt: PlacedBuilding, splitter: PlacedBuilding): boolean {
  return belt.dir === splitter.dir;
}

/**
 * Выходы разделителя в порядке круга: вперёд, влево, вправо. Выход без принимающей ленты
 * (нет здания, не конвейер, лента смотрит на разделитель) — null.
 */
export function splitterOutputs(state: SimState, s: PlacedBuilding, defs: BuildingDefs): (PlacedBuilding | null)[] {
  return [s.dir, (s.dir + 3) % 4, (s.dir + 1) % 4].map((d) => {
    const next = buildingAt(state, s.x + DX[d]!, s.y + DY[d]!);
    return isBelt(next, defs) && next.dir !== (((d + 2) % 4) as Dir) ? next : null;
  });
}

/** Разделитель или фильтрующий разделитель: общая раздача по трём выходам. */
export const isSplitter = (b: PlacedBuilding, defs: BuildingDefs): boolean => {
  const behavior = defs[b.type]?.behavior;
  return behavior === 'splitter' || behavior === 'filterSplitter';
};

/**
 * Поведение splitter и filterSplitter: буфер на один предмет лежит в b.belt (он же возвращается при сносе),
 * круговой индекс следующего выхода — в b.progress (0..2). Предмет уходит на первый по кругу
 * выход, где есть место; если выходов нет или все заняты, он стоит в буфере.
 * Фильтр (b.filter, только у filterSplitter): предмет-фильтр идёт лишь вперёд (выход 0) и ждёт в буфере,
 * остальные — лишь влево и вправо (выходы 1 и 2) по кругу. Без фильтра — как обычный разделитель.
 */
export function runSplitter(b: PlacedBuilding, outs: readonly (PlacedBuilding | null)[]): void {
  const held = b.belt?.[0];
  if (!held) return;
  const allowed = b.filter === undefined ? [0, 1, 2] : held.item === b.filter ? [0] : [1, 2];
  // Начало круга среди допустимых выходов: первый, чей индекс не меньше b.progress.
  const start = Math.max(0, allowed.findIndex((i) => i >= b.progress));
  for (let k = 0; k < allowed.length; k++) {
    const i = allowed[(start + k) % allowed.length]!;
    const out = outs[i];
    if (out && pushToBelt(out, held.item)) {
      b.belt!.shift();
      // Предмет-фильтр круг боковых выходов не сдвигает.
      if (b.filter === undefined || i !== 0) b.progress = (i + 1) % outs.length;
      return;
    }
  }
}

/**
 * Задаёт фильтр фильтрующего разделителя (id здания); null снимает фильтр.
 * Неверную команду (нет здания, не filterSplitter, неизвестный предмет) молча игнорирует.
 */
export function setFilter(state: SimState, buildingId: number, item: string | null, defs: BuildingDefs = contentBuildings): void {
  const b = Object.hasOwn(state.buildings, buildingId) ? state.buildings[buildingId] : undefined;
  if (!b || defs[b.type]?.behavior !== 'filterSplitter') return;
  if (item === null) delete b.filter;
  else if (Object.hasOwn(items, item)) b.filter = item;
}
