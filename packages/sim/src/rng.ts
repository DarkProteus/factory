// Генератор mulberry32: состояние — одно целое число, хранится в SimState.rng.
// Функции чистые над этим числом, глобального состояния нет.

export interface RngStep {
  /** Следующее значение генератора, число из [0, 1). */
  value: number;
  /** Новое состояние генератора. */
  next: number;
}

export function rngStep(rng: number): RngStep {
  const next = (rng + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, next };
}

/** Берёт число из генератора, лежащего в `holder.rng`, и сдвигает его состояние. */
export function nextRandom(holder: { rng: number }): number {
  const { value, next } = rngStep(holder.rng);
  holder.rng = next;
  return value;
}
