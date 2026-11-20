// Общие детали зданий из docs/style.md: корпус, заклёпки, ржавчина, лампа, полосы.
import type { Graphics } from 'pixi.js';
import { palette, type Token } from '../palette';
import { blob, hashInts, seeded } from '../wear';

export const OUTLINE = { width: 2, color: palette.outline } as const;
export const OUTLINE_THIN = { width: 1, color: palette.outline } as const;

export function fill(token: Token, alpha = 1) {
  return { color: palette[token], alpha };
}

/** Корпус: прямоугольник по центру с отступом 2 px от края отпечатка. */
export function body(g: Graphics, w: number, h: number, token: Token): void {
  g.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4).fill(fill(token)).stroke(OUTLINE);
}

/** Заклёпки ⌀d в углах прямоугольника w×h с отступом inset. */
export function rivets(g: Graphics, w: number, h: number, inset = 4, d = 3): void {
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) g.circle(sx * (w / 2 - inset), sy * (h / 2 - inset), d / 2);
  }
  g.fill(fill('steel-light'));
}

/** 1–3 пятна ржавчины на корпусе w×h; всё от хеша id здания. */
export function rust(g: Graphics, id: number, w: number, h: number): void {
  const rand = seeded(hashInts(id, 7));
  const count = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const r = (4 + rand() * 5) / 2;
    const n = 5 + Math.floor(rand() * 4);
    const cx = (rand() - 0.5) * (w - 12);
    const cy = (rand() - 0.5) * (h - 12);
    g.poly(blob(rand, cx, cy, r, n)).fill(fill('rust', 0.6));
  }
}

export type LampState = 'work' | 'wait' | 'off';

/** Лампа ⌀6 в заднем левом углу корпуса (в ориентации N зад — низ). */
export function lamp(g: Graphics, w: number, h: number, state: LampState): void {
  g.circle(-w / 2 + 12, h / 2 - 12, 3).fill(fill(`lamp-${state}`)).stroke(OUTLINE_THIN);
}

type Pt = [number, number];

/** Отсечение выпуклого многоугольника полуплоскостью a·x + b·y <= c. */
function clipHalf(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const dp = a * p[0] + b * p[1] - c;
    const dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if (dp * dq < 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/**
 * Предупредительная окраска внутри выпуклого многоугольника: фон hazard-dark,
 * полосы hazard под 45° шириной step, затем контур.
 */
export function hazardStripes(g: Graphics, points: Pt[], step = 4, outline = OUTLINE_THIN): void {
  g.poly(points.flat()).fill(fill('hazard-dark'));
  const k = Math.SQRT1_2;
  const us = points.map(([x, y]) => (x + y) * k);
  const lo = Math.min(...us);
  const hi = Math.max(...us);
  for (let u = Math.floor(lo / (2 * step)) * 2 * step; u < hi; u += 2 * step) {
    let band = clipHalf(points, k, k, u + step);
    band = clipHalf(band, -k, -k, -u);
    if (band.length >= 3) g.poly(band.flat()).fill(fill('hazard'));
  }
  g.poly(points.flat()).stroke(outline);
}

/** Прямоугольник как список вершин. */
export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}
