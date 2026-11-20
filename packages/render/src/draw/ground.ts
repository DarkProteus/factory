// Земля и залежи. Земля рисуется один раз, залежи — когда меняется число камней.
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import { CELL } from '../palette';
import { hashInts, seeded } from '../wear';
import { coalChunk, oreRock, stoneBlock } from './rocks';
import { fill } from './shapes';

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

/** Залежи: перерисовывает слой при смене вида или числа камней; исходный запас берёт из состояния. */
export class DepositLayer {
  private keys: string[] = [];

  constructor(readonly graphics: Graphics) {}

  update(map: GameMapView): void {
    let changed = this.keys.length !== map.deposits.length;
    const keys = map.deposits.map((d, i) => {
      const key = d ? `${d.item}:${stoneCount(d.amount, d.initial)}` : '';
      if (key !== this.keys[i]) changed = true;
      return key;
    });
    if (!changed) return;
    this.keys = keys;
    this.graphics.clear();
    keys.forEach((key, i) => {
      const [item = '', n = '0'] = key.split(':');
      if (Number(n) > 0) drawStones(this.graphics, item, i % map.width, Math.floor(i / map.width), Number(n));
    });
  }
}

/** Камни залежи в клетке (cx, cy): форма и цвет по виду, места и размеры от хеша клетки. */
function drawStones(g: Graphics, item: string, cx: number, cy: number, n: number): void {
  const rand = seeded(hashInts(cx, cy, 2));
  for (let k = 0; k < n; k++) {
    const size = rand();
    const x = cx * CELL + 6 + rand() * (CELL - 12);
    const y = cy * CELL + 6 + rand() * (CELL - 12);
    if (item === 'coal') coalChunk(g, rand, x, y, (6 + size * 4) / 2);
    else if (item === 'stone') stoneBlock(g, x, y, 7 + size * 5, 5 + rand() * 3);
    else if (item === 'copperOre') oreRock(g, rand, x, y, (6 + size * 5) / 2, 'ore-copper', 'ore-copper-dark');
    else oreRock(g, rand, x, y, (6 + size * 5) / 2, 'ore-iron', 'ore-iron-dark');
  }
}
