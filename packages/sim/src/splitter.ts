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

/**
 * Поведение splitter: буфер на один предмет лежит в b.belt (он же возвращается при сносе),
 * круговой индекс следующего выхода — в b.progress (0..2). Предмет уходит на первый по кругу
 * выход, где есть место; если выходов нет или все заняты, он стоит в буфере.
 */
export function runSplitter(b: PlacedBuilding, outs: readonly (PlacedBuilding | null)[]): void {
  const held = b.belt?.[0];
  if (!held) return;
  for (let k = 0; k < outs.length; k++) {
    const i = (b.progress + k) % outs.length;
    const out = outs[i];
    if (out && pushToBelt(out, held.item)) {
      b.belt!.shift();
      b.progress = (i + 1) % outs.length;
      return;
    }
  }
}
