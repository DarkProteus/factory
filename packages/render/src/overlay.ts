// Оверлей стройки: призрак, сетка вокруг него и рамка под курсором.
// Render только рисует то, что передал app; допустимость места считает app через canPlace.
import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { footprintSize, type Dir } from '@factory/sim';
import { Container, Graphics } from 'pixi.js';
import { drawBuilding, placement, type BuildingView } from './draw/buildings';
import { withGhost } from './draw/shapes';
import type { ViewState } from './interp';
import { CELL, palette } from './palette';

export interface Overlay {
  /** Призрак здания: якорь (x, y) — левая верхняя клетка отпечатка. */
  ghost?: { building: string; x: number; y: number; dir: Dir; valid: boolean };
  /** Рамка вокруг здания, занимающего клетку (x, y); demolish — режим сноса. */
  highlight?: { x: number; y: number; demolish: boolean };
  /** Показывать сетку вокруг призрака. */
  grid: boolean;
  /** Показывать зоны покрытия стоящих столбов (выбран столб, генератор или электрическое здание). */
  zones?: boolean;
}

/** Радиус сетки вокруг призрака, клеток. */
export const GRID_RADIUS = 6;

type Defs = Readonly<Record<string, BuildingDef>>;
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Прямоугольник сетки: отпечаток призрака плюс radius клеток со всех сторон, обрезанный по карте. */
export function gridRect(fp: CellRect, mapW: number, mapH: number, radius = GRID_RADIUS): CellRect {
  const x0 = Math.max(0, fp.x - radius);
  const y0 = Math.max(0, fp.y - radius);
  const x1 = Math.min(mapW, fp.x + fp.w + radius);
  const y1 = Math.min(mapH, fp.y + fp.h + radius);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** Отпечаток здания, занимающего клетку (x, y), или null. */
export function buildingRect(state: ViewState, x: number, y: number, defs: Defs = contentBuildings): CellRect | null {
  const { map } = state;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const b = state.buildings[map.occupancy[y * map.width + x] ?? 0];
  const def = b && defs[b.type];
  if (!b || !def) return null;
  const [w, h] = footprintSize(def.size, b.dir);
  return { x: b.x, y: b.y, w, h };
}

/** Слои оверлея: сетка лежит под зданиями, призрак и рамка поверх. */
export class OverlayLayer {
  readonly grid = new Graphics();
  readonly top = new Container();
  private ghost = new Graphics();
  private frame = new Graphics();

  constructor(private defs: Defs = contentBuildings) {
    this.top.addChild(this.ghost, this.frame);
  }

  update(overlay: Overlay | null, state: ViewState): void {
    this.grid.clear();
    this.ghost.clear();
    this.frame.clear();
    if (!overlay) return;
    const g = overlay.ghost;
    const def = g && this.defs[g.building];
    if (g && def) {
      this.drawGhost(g, def, state);
      if (overlay.grid) this.drawGrid(g, def, state);
    }
    const h = overlay.highlight;
    const rect = h && buildingRect(state, h.x, h.y, this.defs);
    if (h && rect) {
      const color = h.demolish ? palette.bad : palette.text;
      this.frame.rect(rect.x * CELL + 1, rect.y * CELL + 1, rect.w * CELL - 2, rect.h * CELL - 2).stroke({ width: 2, color });
    }
  }

  private drawGhost(g: NonNullable<Overlay['ghost']>, def: BuildingDef, state: ViewState): void {
    const [cx, cy] = placement(def, g.x, g.y, g.dir);
    this.ghost.position.set(cx, cy);
    this.ghost.rotation = def.behavior === 'pole' ? 0 : (g.dir * Math.PI) / 2;
    drawPreview(this.ghost, g.building, def, state, g.dir, g.valid ? 'ok' : 'bad');
  }

  private drawGrid(g: NonNullable<Overlay['ghost']>, def: BuildingDef, state: ViewState): void {
    const [w, h] = footprintSize(def.size, g.dir);
    const r = gridRect({ x: g.x, y: g.y, w, h }, state.map.width, state.map.height);
    for (let i = 0; i <= r.w; i++) this.grid.moveTo((r.x + i) * CELL, r.y * CELL).lineTo((r.x + i) * CELL, (r.y + r.h) * CELL);
    for (let j = 0; j <= r.h; j++) this.grid.moveTo(r.x * CELL, (r.y + j) * CELL).lineTo((r.x + r.w) * CELL, (r.y + j) * CELL);
    this.grid.stroke({ width: 1, color: palette.grid });
  }
}

/**
 * Рисует здание без состояния в ориентации N с центром в (0, 0): призраком (mode ok или bad)
 * или обычным видом (mode null — для иконок). Graphics поворачивает вызывающий.
 */
export function drawPreview(
  g: Graphics,
  type: string,
  def: BuildingDef,
  state: ViewState,
  dir: Dir,
  mode: 'ok' | 'bad' | null,
): void {
  const view: BuildingView = { id: 0, type, x: 0, y: 0, dir, progress: 0, output: null };
  const ctx = { state, tick: 0, alpha: 0, armAngle: () => Math.PI };
  withGhost(mode, () => drawBuilding(g, view, def, ctx));
}

