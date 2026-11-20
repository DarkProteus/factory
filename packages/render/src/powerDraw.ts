// Отрисовка энергии на карте по docs/style.md, «Энергия на карте». Что рисовать, решает powerView.
import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { Graphics } from 'pixi.js';
import { drawItem } from './draw/items';
import type { ViewState } from './interp';
import type { Overlay } from './overlay';
import { CELL, palette } from './palette';
import { badgeAlpha, badges, ghostLinks, wireSegments, zoneRect, type Badge, type Rect } from './powerView';

type Defs = Readonly<Record<string, BuildingDef>>;

/** Длина штриха и промежутка пунктира призрака, px. */
const DASH = 4;

/** Три слоя: зоны под зданиями, провода над предметами, значки поверх всего. */
export class PowerLayer {
  readonly zones = new Graphics();
  readonly wires = new Graphics();
  readonly badges = new Graphics();

  constructor(private defs: Defs = contentBuildings) {}

  update(state: ViewState, overlay: Overlay | null, time: number): void {
    this.zones.clear();
    this.wires.clear();
    this.badges.clear();
    this.drawZones(state, overlay);
    this.drawWires(state, overlay);
    this.drawBadges(state, time);
  }

  private zone(r: Rect, fillAlpha: number, lineAlpha: number, color: number): void {
    this.zones.rect(r.x * CELL, r.y * CELL, r.w * CELL, r.h * CELL).fill({ color, alpha: fillAlpha });
    this.zones.rect(r.x * CELL + 0.5, r.y * CELL + 0.5, r.w * CELL - 1, r.h * CELL - 1).stroke({ width: 1, color, alpha: lineAlpha });
  }

  private drawZones(state: ViewState, overlay: Overlay | null): void {
    const { width, height } = state.map;
    if (overlay?.zones) {
      for (const b of Object.values(state.buildings)) {
        const def = this.defs[b.type];
        if (def?.behavior === 'pole') this.zone(zoneRect(b, def.coverage ?? 0, width, height), 0.08, 0.5, palette.power);
      }
    }
    const g = overlay?.ghost;
    const def = g && this.defs[g.building];
    if (g && def?.behavior === 'pole') {
      this.zone(zoneRect(g, def.coverage ?? 0, width, height), 0.16, 0.8, g.valid ? palette.power : palette.bad);
    }
  }

  private drawWires(state: ViewState, overlay: Overlay | null): void {
    for (const [x1, y1, x2, y2] of wireSegments(state, this.defs)) this.wires.moveTo(x1, y1).lineTo(x2, y2);
    this.wires.stroke({ width: 1.5, color: palette.copper, alpha: 0.9 });
    const g = overlay?.ghost;
    if (!g) return;
    const from = [(g.x + 0.5) * CELL, (g.y + 0.5) * CELL] as const;
    for (const id of ghostLinks(state, g, g.building, this.defs)) {
      const pole = state.buildings[id]!;
      dashed(this.wires, from[0], from[1], (pole.x + 0.5) * CELL, (pole.y + 0.5) * CELL);
    }
    this.wires.stroke({ width: 1.5, color: palette.copper, alpha: 0.5 });
  }

  private drawBadges(state: ViewState, time: number): void {
    this.badges.alpha = badgeAlpha(time);
    for (const b of badges(state, this.defs)) drawBadge(this.badges, b);
  }
}

/** Пунктир 4/4 px от (x1, y1) к (x2, y2); штрихи добавляются в путь, stroke вызывает вызывающий. */
function dashed(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = len === 0 ? [0, 0] : [(x2 - x1) / len, (y2 - y1) / len];
  for (let d = 0; d < len; d += 2 * DASH) {
    const e = Math.min(d + DASH, len);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
  }
}

/** Значок ⌀18 px: подложка `bad` с контуром `outline` и молния `hazard` либо уголь, перечёркнутый `plate-light`. */
function drawBadge(g: Graphics, b: Badge): void {
  g.circle(b.x, b.y, 9).fill({ color: palette.bad }).stroke({ width: 1.5, color: palette.outline });
  if (b.kind === 'power') {
    // Молния: ломаная из 6 вершин, высота 10 px.
    const pts = [1.5, -5, -3, 1, -0.3, 1, -1.5, 5, 3, -1, 0.3, -1];
    g.poly(pts.map((v, i) => v + (i % 2 === 0 ? b.x : b.y))).fill({ color: palette.hazard });
    return;
  }
  drawItem(g, 'coal', b.x, b.y, 9);
  g.moveTo(b.x - 5, b.y + 5).lineTo(b.x + 5, b.y - 5).stroke({ width: 1.5, color: palette['plate-light'] });
}
