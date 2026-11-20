// Интерполяция между тиками. Решение записано в TASK-9.
import type { SimState } from '@factory/sim';

/** Состояние глубоко только для чтения: render его не меняет. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type ViewState = DeepReadonly<SimState>;

export interface SnapItem {
  readonly item: string;
  readonly pos: number;
}

/** Снимок предметов на конвейерах до тика: id конвейера -> ряд предметов. */
export type BeltSnapshot = ReadonlyMap<number, readonly SnapItem[]>;

export function captureBelts(state: ViewState): BeltSnapshot {
  const snap = new Map<number, SnapItem[]>();
  for (const b of Object.values(state.buildings)) {
    if (b.belt && b.belt.length > 0) snap.set(b.id, b.belt.map((it) => ({ item: it.item, pos: it.pos })));
  }
  return snap;
}

/**
 * Позиция предмета на кадре между тиками. prev — ряд того же конвейера в снимке,
 * speed — beltSpeed. Результат может быть меньше 0: предмет ещё на стыке с прошлой клеткой.
 */
export function beltItemPos(
  prev: readonly SnapItem[] | undefined,
  item: string,
  pos: number,
  speed: number,
  alpha: number,
): number {
  const match = prev?.find((p) => p.item === item && p.pos <= pos && p.pos >= pos - speed);
  let from: number;
  if (match) from = match.pos;
  else if (pos === 0) from = pos;
  else from = pos - speed;
  return from + (pos - from) * alpha;
}
