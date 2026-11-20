// Фигуры сырья из docs/style.md: одни и те же формы у залежей на земле и у предметов.
import type { Graphics } from 'pixi.js';
import type { Token } from '../palette';
import { blob } from '../wear';
import { fill, OUTLINE_THIN } from './shapes';

/** Неправильный шестиугольник радиуса r с одной тёмной гранью (руда). */
export function oreRock(g: Graphics, rand: () => number, x: number, y: number, r: number, base: Token, dark: Token): void {
  const pts = blob(rand, x, y, r, 6);
  g.poly(pts).fill(fill(base));
  g.poly([x, y, pts[0]!, pts[1]!, pts[2]!, pts[3]!]).fill(fill(dark));
  g.poly(pts).stroke(OUTLINE_THIN);
}

/** Неправильный четырёхугольник радиуса r с гранью-бликом (уголь). */
export function coalChunk(g: Graphics, rand: () => number, x: number, y: number, r: number): void {
  const pts = blob(rand, x, y, r, 4);
  g.poly(pts).fill(fill('coal'));
  g.poly([x, y, pts[0]!, pts[1]!, pts[2]!, pts[3]!]).fill(fill('coal-light'));
  g.poly(pts).stroke(OUTLINE_THIN);
}

/** Скруглённая глыба w×h с нижней полосой (камень); радиус скругления и полоса растут с масштабом s. */
export function stoneBlock(g: Graphics, x: number, y: number, w: number, h: number, s = 1): void {
  const [x0, y0] = [x - w / 2, y - h / 2];
  g.roundRect(x0, y0, w, h, 2 * s).fill(fill('stone'));
  g.rect(x0 + s, y0 + h - 2 * s, w - 2 * s, 2 * s).fill(fill('stone-dark'));
  g.roundRect(x0, y0, w, h, 2 * s).stroke(OUTLINE_THIN);
}
