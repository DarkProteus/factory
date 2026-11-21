// Иконки предметов: одна форма на карте, в руке манипулятора и в интерфейсе.
import { buildings as contentBuildings } from '@factory/content';
import type { Graphics } from 'pixi.js';
import { palette, type Token } from '../palette';
import { seeded } from '../wear';
import { drawBuildingIcon } from './buildingIcon';
import { coalChunk, oreRock, stoneBlock } from './rocks';
import { fill, OUTLINE_THIN } from './shapes';

/** Основная заливка предмета: ей рисуется круг при мелком зуме. */
const MAIN_COLOR: Record<string, number> = {
  ironOre: palette['ore-iron'],
  copperOre: palette['ore-copper'],
  coal: palette.coal,
  stone: palette.stone,
  ironPlate: palette.plate,
  copperPlate: palette.copper,
  stoneBrick: palette.rust,
  ironGear: palette.plate,
  copperCable: palette.copper,
  circuit: palette.pcb,
  ammo: palette.brass,
  steelPlate: palette['steel-plate'],
  sciencePackRed: palette['science-red'],
  sciencePackGreen: palette['science-green'],
};

/** Предмет размером size px с центром в (x, y); lod — круг ⌀5 вместо формы. */
export function drawItem(g: Graphics, item: string, x: number, y: number, size: number, lod = false): void {
  if (lod) {
    const isBuilding = item in contentBuildings;
    g.circle(x, y, 2.5).fill({ color: MAIN_COLOR[item] ?? (isBuilding ? palette.steel : palette.text) });
    return;
  }
  const s = size / 12;
  switch (item) {
    case 'ironOre':
      return oreRock(g, seeded(0x0e1), x, y, 6 * s, 'ore-iron', 'ore-iron-dark');
    case 'copperOre':
      return oreRock(g, seeded(0x0e1), x, y, 6 * s, 'ore-copper', 'ore-copper-dark');
    case 'coal':
      return coalChunk(g, seeded(0xc0a1), x, y, 6 * s);
    case 'stone':
      return stoneBlock(g, x, y, 12 * s, 8 * s, s);
    case 'ironPlate':
      return plate(g, x, y, s, 'plate', 'plate-light');
    case 'copperPlate':
      return plate(g, x, y, s, 'copper', 'copper-light');
    case 'steelPlate':
      plate(g, x, y, s, 'steel-plate', 'steel-plate-light');
      // Диагональная риска 1 px `steel` через центр.
      g.moveTo(x - 3 * s, y + 3 * s).lineTo(x + 3 * s, y - 3 * s).stroke({ width: s, color: palette.steel });
      return;
    case 'sciencePackRed':
      return flask(g, x, y, s, 'science-red');
    case 'sciencePackGreen':
      return flask(g, x, y, s, 'science-green');
    case 'stoneBrick':
      g.rect(x - 6 * s, y - 3.5 * s, 12 * s, 7 * s).fill(fill('rust'));
      g.moveTo(x - 6 * s, y).lineTo(x + 6 * s, y).stroke({ width: s, color: palette['rust-dark'] });
      g.rect(x - 6 * s, y - 3.5 * s, 12 * s, 7 * s).stroke(OUTLINE_THIN);
      return;
    case 'ironGear':
      return gear(g, x, y, s);
    case 'copperCable':
      return cable(g, x, y, s);
    case 'circuit':
      return circuit(g, x, y, s);
    case 'ammo': {
      for (const dx of [-3.5, 0, 3.5]) {
        g.roundRect(x + (dx - 1.5) * s, y - 5 * s, 3 * s, 10 * s, 1.5 * s)
          .fill(fill('brass'))
          .stroke(OUTLINE_THIN);
      }
      return;
    }
    default:
      // Предмет-здание: форма здания с карты в ориентации N; неизвестный предмет — кружок.
      if (drawBuildingIcon(g, item, x, y, size)) return;
      g.circle(x, y, 4 * s).fill(fill('text')).stroke(OUTLINE_THIN);
  }
}

/** Пластина: квадрат со скруглением, блик по верхнему и левому краю. */
function plate(g: Graphics, x: number, y: number, s: number, base: Token, light: Token): void {
  const h = 5 * s;
  g.roundRect(x - h, y - h, 2 * h, 2 * h, 2 * s).fill(fill(base));
  g.rect(x - h + s, y - h + s, 2 * h - 3 * s, 2 * s).fill(fill(light));
  g.rect(x - h + s, y - h + s, 2 * s, 2 * h - 3 * s).fill(fill(light));
  g.roundRect(x - h, y - h, 2 * h, 2 * h, 2 * s).stroke(OUTLINE_THIN);
}

/** Шестерня: круг с шестью зубцами 3 px и отверстием ⌀3 px. */
function gear(g: Graphics, x: number, y: number, s: number): void {
  const t = 1.5 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const [c, n] = [Math.cos(a), Math.sin(a)];
    const [px, py] = [x + c * 4.5 * s, y + n * 4.5 * s];
    const pts = [
      [-t, -t],
      [t, -t],
      [t, t],
      [-t, t],
    ].flatMap(([u, v]) => [px + u! * c - v! * n, py + u! * n + v! * c]);
    g.poly(pts).fill(fill('plate')).stroke(OUTLINE_THIN);
  }
  g.circle(x, y, 4 * s).fill(fill('plate')).stroke(OUTLINE_THIN);
  g.circle(x, y, 1.5 * s).fill(fill('outline'));
}

/** Моток провода: две параллельные дуги 2 px с контуром 1 px. */
function cable(g: Graphics, x: number, y: number, s: number): void {
  for (const dy of [-2.5, 2.5]) {
    const [cx, cy] = [x, y + dy * s + 2 * s];
    g.moveTo(cx - 5 * s, cy).arc(cx, cy, 5 * s, Math.PI, 2 * Math.PI);
    g.stroke({ width: 4 * s, color: palette.outline });
    g.moveTo(cx - 5 * s, cy).arc(cx, cy, 5 * s, Math.PI, 2 * Math.PI);
    g.stroke({ width: 2 * s, color: palette.copper });
  }
}

/** Электросхема: плата, две дорожки меди и чип. */
function circuit(g: Graphics, x: number, y: number, s: number): void {
  g.roundRect(x - 6 * s, y - 6 * s, 12 * s, 12 * s, s).fill(fill('pcb'));
  g.moveTo(x - 5 * s, y - 3 * s).lineTo(x + 5 * s, y - 3 * s);
  g.moveTo(x - 5 * s, y + 3 * s).lineTo(x + 5 * s, y + 3 * s);
  g.stroke({ width: s, color: palette.copper });
  g.rect(x - 2 * s, y - 2 * s, 4 * s, 4 * s).fill(fill('hazard-dark'));
  g.roundRect(x - 6 * s, y - 6 * s, 12 * s, 12 * s, s).stroke(OUTLINE_THIN);
}

/** Колба научного пакета: круг ⌀9 снизу, горлышко 4×4 сверху, блик слева, пробка 4×2 `steel`, контур. */
function flask(g: Graphics, x: number, y: number, s: number, color: Token): void {
  const [cy, r] = [y + 1.5 * s, 4.5 * s];
  const k = Math.asin((2 * s) / r);
  const path = () => {
    g.moveTo(x - 2 * s, y - 5.5 * s).lineTo(x + 2 * s, y - 5.5 * s).lineTo(x + 2 * s, cy - r * Math.cos(k));
    g.arc(x, cy, r, -Math.PI / 2 + k, (3 * Math.PI) / 2 - k).lineTo(x - 2 * s, y - 5.5 * s).closePath();
  };
  path();
  g.fill(fill(color));
  // Блик: дуга 1 px `plate-light` слева.
  g.moveTo(x + 3.4 * s * Math.cos(Math.PI * 1.2), cy + 3.4 * s * Math.sin(Math.PI * 1.2)).arc(x, cy, 3.4 * s, Math.PI * 1.2, Math.PI * 0.8, true).stroke({ width: s, color: palette['plate-light'] });
  path();
  g.stroke(OUTLINE_THIN);
  g.rect(x - 2 * s, y - 7.5 * s, 4 * s, 2 * s).fill(fill('steel')).stroke(OUTLINE_THIN);
}
