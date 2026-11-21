// Оверлей стройки: призрак, сетка вокруг него и рамка под курсором.
// Render только рисует то, что передал app; допустимость места считает app через canPlace.
import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { footprintSize, undergroundPlacement, type Dir, type SimState } from '@factory/sim';
import { Container, Graphics, Text } from 'pixi.js';
import { drawBuilding, placement, type BuildingView } from './draw/buildings';
import { tunnelSpans } from './draw/m3';
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

/** Цвет `text-dim` интерфейса (в палитре Pixi его нет, см. theme.css). */
const TEXT_DIM = 0xa89f92;
/** Длина штриха и промежутка пунктира, px. */
const DASH = 4;

/** Пунктирная линия: штрихи добавляются в путь g, обводку (stroke) вызывает вызывающий. */
function dashedLine(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  for (let d = 0; d < len; d += 2 * DASH) {
    const e = Math.min(d + DASH, len);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
  }
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
  /** Подпись «вход» над призраком подземного: тень и текст, создаются при первой надобности. */
  private label: Text[] | null = null;

  constructor(private defs: Defs = contentBuildings) {
    this.top.addChild(this.ghost, this.frame);
  }

  update(overlay: Overlay | null, state: ViewState): void {
    this.grid.clear();
    this.ghost.clear();
    this.frame.clear();
    this.label?.forEach((t) => (t.visible = false));
    if (!overlay) return;
    if (overlay.grid) this.drawSpans(state);
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
    const mode = g.valid ? 'ok' : 'bad';
    if (def.behavior !== 'underground') return drawPreview(this.ghost, g.building, def, state, g.dir, mode);
    // Роль подземного определяет постановка: выход при входе без пары позади, иначе вход.
    const { role, partner } = undergroundPlacement(state as unknown as SimState, g.building, g.x, g.y, g.dir);
    drawPreview(this.ghost, g.building, def, state, g.dir, mode, { underground: role });
    const mate = partner === null ? undefined : state.buildings[partner];
    if (mate) {
      // Вход-пара: рамка 2 px и пунктир 1 px до призрака.
      this.frame.rect(mate.x * CELL + 1, mate.y * CELL + 1, CELL - 2, CELL - 2).stroke({ width: 2, color: palette[mode] });
      dashedLine(this.frame, (mate.x + 0.5) * CELL, (mate.y + 0.5) * CELL, cx, cy);
      this.frame.stroke({ width: 1, color: palette[mode] });
    } else this.showLabel('вход', cx, cy - CELL / 2 - 3);
  }

  /** Подпись IBM Plex Sans 12 px `text-dim` с тенью 1 px `outline`; якорь — середина нижнего края. */
  private showLabel(text: string, x: number, y: number): void {
    this.label ??= [
      [1, palette.outline],
      [0, TEXT_DIM],
    ].map(([off, color]) => {
      const t = new Text({ text, style: { fontFamily: 'IBM Plex Sans', fontSize: 12, fill: color } });
      t.anchor.set(0.5, 1);
      t.position.set(off!, off!);
      this.top.addChild(t);
      return t;
    });
    this.label.forEach((t, i) => {
      t.visible = true;
      t.text = text;
      t.position.set(x + (i === 0 ? 1 : 0), y + (i === 0 ? 1 : 0));
    });
  }

  /** В режиме стройки клетки между входом и выходом пары обведены пунктиром 1 px `ok` α 0.5. */
  private drawSpans(state: ViewState): void {
    for (const s of tunnelSpans(state, this.defs)) {
      const [x0, y0] = [Math.min(s.from.x, s.to.x), Math.min(s.from.y, s.to.y)];
      const [x1, y1] = [Math.max(s.from.x, s.to.x) + 1, Math.max(s.from.y, s.to.y) + 1];
      const [l, t, r, b] = [x0 * CELL + 1, y0 * CELL + 1, x1 * CELL - 1, y1 * CELL - 1];
      for (const [ax, ay, bx, by] of [[l, t, r, t], [r, t, r, b], [r, b, l, b], [l, b, l, t]] as const) dashedLine(this.grid, ax, ay, bx, by);
      this.grid.stroke({ width: 1, color: palette.ok, alpha: 0.5 });
    }
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
  extra: Partial<BuildingView> = {},
): void {
  const view: BuildingView = { id: 0, type, x: 0, y: 0, dir, progress: 0, output: null, ...extra };
  const ctx = { state, tick: 0, alpha: 0, armAngle: () => Math.PI };
  withGhost(mode, () => drawBuilding(g, view, def, ctx));
}

