// Иконки предметов: одна форма на карте, в руке манипулятора и в интерфейсе.
import type { Graphics } from 'pixi.js';
import { palette } from '../palette';
import { blob, seeded } from '../wear';
import { fill, OUTLINE_THIN } from './shapes';

/** Основная заливка предмета: ей рисуется круг при мелком зуме. */
const MAIN_COLOR: Record<string, number> = {
  ironOre: palette['ore-iron'],
  ironPlate: palette.plate,
  ammo: palette.brass,
};

/** Предмет размером size px с центром в (x, y); lod — круг ⌀5 вместо формы. */
export function drawItem(g: Graphics, item: string, x: number, y: number, size: number, lod = false): void {
  if (lod) {
    g.circle(x, y, 2.5).fill({ color: MAIN_COLOR[item] ?? palette.text });
    return;
  }
  const s = size / 12;
  switch (item) {
    case 'ironOre': {
      const pts = blob(seeded(0x0e1), x, y, 6 * s, 6);
      g.poly(pts).fill(fill('ore-iron'));
      g.poly([x, y, pts[0]!, pts[1]!, pts[2]!, pts[3]!]).fill(fill('ore-iron-dark'));
      g.poly(pts).stroke(OUTLINE_THIN);
      return;
    }
    case 'ironPlate': {
      const h = 5 * s;
      g.roundRect(x - h, y - h, 2 * h, 2 * h, 2 * s).fill(fill('plate'));
      g.rect(x - h + s, y - h + s, 2 * h - 3 * s, 2 * s).fill(fill('plate-light'));
      g.rect(x - h + s, y - h + s, 2 * s, 2 * h - 3 * s).fill(fill('plate-light'));
      g.roundRect(x - h, y - h, 2 * h, 2 * h, 2 * s).stroke(OUTLINE_THIN);
      return;
    }
    case 'ammo': {
      for (const dx of [-3.5, 0, 3.5]) {
        g.roundRect(x + (dx - 1.5) * s, y - 5 * s, 3 * s, 10 * s, 1.5 * s)
          .fill(fill('brass'))
          .stroke(OUTLINE_THIN);
      }
      return;
    }
    default:
      g.circle(x, y, 4 * s).fill(fill('text')).stroke(OUTLINE_THIN);
  }
}
