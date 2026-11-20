// Детерминированный «износ»: всё случайное на картинке берётся из хеша
// координат клетки или id здания. Math.random не используется.

/** 32-битный хеш нескольких целых (вариант murmur3 finalizer). */
export function hashInts(...values: number[]): number {
  let h = 0x9e3779b9;
  for (const v of values) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Генератор чисел 0..1 от зерна; одно зерно — одна и та же последовательность. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

/** Неправильный многоугольник: n вершин вокруг (cx, cy) с радиусом r·(0.7..1). */
export function blob(rand: () => number, cx: number, cy: number, r: number, n: number): number[] {
  const points: number[] = [];
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    const k = 0.7 + rand() * 0.3;
    points.push(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k);
  }
  return points;
}
