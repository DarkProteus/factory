// Земля и залежи. Земля рисуется один раз, залежи — когда меняется число камней.
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import { CELL } from '../palette';
import { blob, hashInts, seeded } from '../wear';
import { fill, OUTLINE_THIN } from './shapes';

type GameMapView = ViewState['map'];

export function drawGround(g: Graphics, map: GameMapView): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const h = hashInts(x, y, 1) % 4;
      const token = h < 2 ? 'ground-0' : h === 2 ? 'ground-1' : 'ground-2';
      g.rect(x * CELL, y * CELL, CELL, CELL).fill(fill(token));
    }
  }
}

/** Число камней по доле остатка: 5 при ≥ 75 %, 4 при ≥ 50 %, 3 при ≥ 25 %, 2 ниже, 0 — пусто. */
export function stoneCount(amount: number, initial: number): number {
  if (amount <= 0) return 0;
  const f = initial > 0 ? amount / initial : 1;
  return f >= 0.75 ? 5 : f >= 0.5 ? 4 : f >= 0.25 ? 3 : 2;
}

/** Залежи: перерисовывает слой при смене числа камней; исходный запас берёт из состояния. */
export class DepositLayer {
  private counts: number[] = [];

  constructor(readonly graphics: Graphics) {}

  update(map: GameMapView): void {
    let changed = this.counts.length !== map.deposits.length;
    const counts = map.deposits.map((d, i) => {
      if (!d) return 0;
      const n = stoneCount(d.amount, d.initial);
      if (n !== this.counts[i]) changed = true;
      return n;
    });
    if (!changed) return;
    this.counts = counts;
    this.graphics.clear();
    counts.forEach((n, i) => {
      if (n > 0) drawStones(this.graphics, i % map.width, Math.floor(i / map.width), n);
    });
  }
}

function drawStones(g: Graphics, cx: number, cy: number, n: number): void {
  const rand = seeded(hashInts(cx, cy, 2));
  for (let k = 0; k < n; k++) {
    const r = (6 + rand() * 5) / 2;
    const x = cx * CELL + 6 + rand() * (CELL - 12);
    const y = cy * CELL + 6 + rand() * (CELL - 12);
    const pts = blob(rand, x, y, r, 6);
    g.poly(pts).fill(fill('ore-iron'));
    g.poly([x, y, pts[0]!, pts[1]!, pts[2]!, pts[3]!]).fill(fill('ore-iron-dark'));
    g.poly(pts).stroke(OUTLINE_THIN);
  }
}
