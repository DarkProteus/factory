// Сущности M3 по docs/style-m3.md: лаборатория, подземный конвейер, фильтрующий разделитель,
// акцент быстрых версий. Как и остальные здания, всё рисуется в ориентации N с центром в (0, 0).
import { buildings as contentBuildings, technologies, type BuildingDef } from '@factory/content';
import { BELT_CELL } from '@factory/sim';
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import { CELL, GLASS_ALPHA, type Token } from '../palette';
import { satisfactionOf } from '../powerView';
import type { BuildingView, FrameCtx } from './buildings';
import { body, fill, hazardStripes, lamp, line, OUTLINE, OUTLINE_THIN, rectPts, rivets, rust, type LampState } from './shapes';

/** Быстрая ли версия: лента быстрее обычной или манипулятор замахивается быстрее. Берёт сравнение с базовым зданием content. */
export function isFast(def: BuildingDef): boolean {
  if (def.beltSpeed !== undefined) return def.beltSpeed > (contentBuildings.belt.beltSpeed ?? 0);
  if (def.behavior === 'inserter') return (def.swingTicks ?? Infinity) < (contentBuildings.inserter.swingTicks ?? 0);
  return false;
}

/** Цвет шевронов ленты: `fast` у быстрых, `rust-light` у обычных. */
export const chevronToken = (def: BuildingDef): Token => (isFast(def) ? 'fast' : 'rust-light');

/** Предмет на ленте подземного входа в тоннеле (за первой клеткой): его не рисуют. */
export const inTunnel = (pos: number): boolean => pos > BELT_CELL;

/** Половина иконки предмета на ленте (4 px) в единицах пути: 256 единиц = клетка 32 px. */
const HALF_ICON = (4 / CELL) * BELT_CELL;

/**
 * Скрыт ли предмет порталом: вход прячет предмет, когда иконка целиком ушла за край клетки (и всё, что в тоннеле),
 * выход не показывает предмет, пока он целиком в портале. Так иконка не торчит за край проёма.
 */
export const hiddenByPortal = (role: 'in' | 'out' | undefined, pos: number): boolean =>
  role === 'in' ? pos > BELT_CELL - HALF_ICON : role === 'out' && pos < HALF_ICON;

/**
 * Шевроны «>» на отрезке ленты y0..y1 (ориентация N, вперёд — вверх). Едут со скоростью предметов:
 * 256 единиц пути = 32 px, шаг 16 px; ветви обрезаются по отрезку.
 */
export function beltChevrons(g: Graphics, ctx: FrameCtx, def: BuildingDef, y0: number, y1: number): void {
  const speed = def.beltSpeed ?? 0;
  const shift = ((((ctx.tick + ctx.alpha) * speed) % 128) / 256) * CELL;
  for (let k = 0; k < 3; k++) {
    const tip = CELL / 2 - k * 16 - shift;
    for (const side of [-1, 1]) {
      const t0 = Math.max(0, (tip + 5 - y1) / 5);
      const t1 = Math.min(1, (tip + 5 - y0) / 5);
      if (t0 >= t1) continue;
      g.moveTo(side * 5 * (1 - t0), tip + 5 - 5 * t0).lineTo(side * 5 * (1 - t1), tip + 5 - 5 * t1);
    }
  }
  g.stroke(line(chevronToken(def), 2));
}

/** Рельсы и полотно ленты на отрезке y0..y1. */
export function beltBed(g: Graphics, y0: number, y1: number): void {
  const w = CELL;
  g.rect(-w / 2 + 3, y0, w - 6, y1 - y0).fill(fill('hazard-dark'));
  for (const x of [-w / 2, w / 2 - 3]) g.rect(x, y0, 3, y1 - y0).fill(fill('steel')).stroke(OUTLINE_THIN);
}

/** Манипулятор: полоса 2 px акцента `fast` по переднему краю основания и акцентная метка вместо `hazard`. */
export function fastInserterMark(g: Graphics): void {
  const a = -Math.PI / 2 - 0.9;
  g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8).arc(0, 0, 8, a, -Math.PI / 2 + 0.9).stroke(line('fast', 2));
}

// --- Подземный конвейер ---

/** Роль и пара призрака подземного: куда рисовать рамку и пунктир. */
export function portalSide(role: 'in' | 'out' | undefined): -1 | 1 {
  // Вход: портал впереди (y < 0), выход: портал сзади (y > 0).
  return role === 'out' ? 1 : -1;
}

/** Портал: корпус на половине клетки, проём и козырёк на стороне ленты. */
export function drawPortal(g: Graphics, role: 'in' | 'out' | undefined, fast: boolean): void {
  const side = portalSide(role);
  const y0 = side < 0 ? -CELL / 2 : 0;
  const at = (v: number, h: number): [number, number] => [side < 0 ? -v - h : v, h]; // [y, height] по расстоянию v от края y = 0
  g.rect(-CELL / 2, y0, CELL, CELL / 2).fill(fill('steel-dark')).stroke(OUTLINE_THIN);
  const [ay, ah] = at(3, 10);
  g.rect(-11, ay, 22, ah).fill(fill('hazard-dark')).stroke(line('steel', 1));
  for (const x of [-13, 13]) g.circle(x, side < 0 ? -14 : 14, 1.2);
  g.fill(fill('steel-light'));
  const [vy, vh] = at(0, 3);
  const tokens: [Token, Token] = fast ? ['fast', 'fast-dark'] : ['hazard', 'hazard-dark'];
  hazardStripes(g, rectPts(-13, vy, 26, vh), 4, line('steel', 1), tokens);
}

/** Лента подземного без портала: рельсы, полотно и шевроны на половине клетки, противоположной порталу. */
export function drawUndergroundBelt(g: Graphics, role: 'in' | 'out' | undefined, def: BuildingDef, ctx: FrameCtx): void {
  const [y0, y1] = role === 'out' ? [-CELL / 2, 0] : [0, CELL / 2];
  beltBed(g, y0, y1);
  beltChevrons(g, ctx, def, y0, y1);
}

export function drawUnderground(g: Graphics, b: BuildingView, def: BuildingDef, ctx: FrameCtx): void {
  drawUndergroundBelt(g, b.underground, def, ctx);
  if (!ctx.portalsApart) drawPortal(g, b.underground, isFast(def));
}

/** Пролёт пары подземных: клетки строго между входом и выходом. */
export interface Span {
  inId: number;
  outId: number;
  /** Первая и последняя клетка между входом и выходом (совпадают, если клетка одна). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Число клеток между входом и выходом. */
  between: number;
}

const STEP: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Пролёты всех пар вход → выход по расстановке (то же правило, что в sim: ближайший впереди того же типа и направления). */
export function tunnelSpans(state: ViewState, defs: Readonly<Record<string, BuildingDef>> = contentBuildings): Span[] {
  const out: Span[] = [];
  const { map } = state;
  for (const b of Object.values(state.buildings)) {
    const def = defs[b.type];
    if (b.underground !== 'in' || def?.behavior !== 'underground') continue;
    const [dx, dy] = STEP[b.dir]!;
    for (let k = 1; k <= (def.undergroundReach ?? 0) + 1; k++) {
      const x = b.x + dx * k;
      const y = b.y + dy * k;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) break;
      const n = state.buildings[map.occupancy[y * map.width + x] ?? 0];
      if (!n || n.type !== b.type || n.dir !== b.dir) continue;
      if (n.underground === 'out' && k > 1) {
        out.push({ inId: b.id, outId: n.id, from: { x: b.x + dx, y: b.y + dy }, to: { x: x - dx, y: y - dy }, between: k - 1 });
      }
      break;
    }
  }
  return out;
}

// --- Лаборатория ---

/** Вид пакетов в порядке ячеек: по таблице технологий. */
export const PACK_KINDS: readonly string[] = [...new Set(Object.values(technologies).flatMap((t) => Object.keys(t.unit)))];

/** Центр ячейки пакета k относительно центра лаборатории (задний край корпуса). */
export const packCell = (k: number): [number, number] => [-6 + 12 * k, 36];

/** Исследует ли лаборатория: хотела работать в этом тике при активной технологии. */
export function labWorking(state: ViewState, b: BuildingView): boolean {
  return b.draw === true && activeTech(state) !== null;
}

/** Активная технология; у «пустого» состояния иконок и призраков исследований нет. */
const activeTech = (state: ViewState): string | null => state.research?.active ?? null;

/** Цвета пакетов текущей единицы (красный, зелёный или оба); null, если лаборатория не исследует. */
export function labColors(state: ViewState, b: BuildingView): Token[] | null {
  const active = activeTech(state);
  if (!labWorking(state, b) || active === null) return null;
  const unit = (technologies as Record<string, { unit: Record<string, number> }>)[active]?.unit ?? {};
  const colors: Token[] = [];
  if (unit.sciencePackRed) colors.push('science-red');
  if (unit.sciencePackGreen) colors.push('science-green');
  return colors.length > 0 ? colors : null;
}

export function labLamp(state: ViewState, b: BuildingView): LampState {
  if (activeTech(state) === null || satisfactionOf(state, b.id) === 0) return 'off';
  return labWorking(state, b) ? 'work' : 'wait';
}

/** Колба: круг ⌀30 с горлышком 10×10 сверху; один контур для заливки и обводки. */
function flaskPath(g: Graphics): void {
  const [cy, r] = [2, 15];
  const k = Math.asin(5 / r);
  g.moveTo(-5, -23).lineTo(5, -23).lineTo(5, cy - r * Math.cos(k));
  g.arc(0, cy, r, -Math.PI / 2 + k, (3 * Math.PI) / 2 - k).lineTo(-5, -23).closePath();
}

export function drawLab(g: Graphics, b: BuildingView, ctx: FrameCtx, w: number, h: number): void {
  body(g, w, h, 'steel-dark');
  g.rect(-w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7).stroke(line('steel', 3));
  rust(g, b.id, w, h);
  rivets(g, w, h, 6);
  const colors = labColors(ctx.state, b);
  if (colors) {
    // Свечение: цвет пакета α 0.25 кругом ⌀40, пульс α 0.15..0.35 за 90 тиков.
    const pulse = 0.25 + 0.1 * Math.sin(((ctx.tick + ctx.alpha) / 90) * Math.PI * 2);
    g.circle(0, 2, 20).fill(fill(colors[0]!, pulse));
  }
  flaskPath(g);
  g.fill(fill('glass', GLASS_ALPHA));
  if (colors?.length === 1) g.circle(0, 2, 14).fill(fill(colors[0]!, 0.9));
  else if (colors) {
    // Оба пакета: нижняя половина красная, верхняя зелёная.
    g.moveTo(14, 2).arc(0, 2, 14, 0, Math.PI).closePath().fill(fill('science-red', 0.9));
    g.moveTo(-14, 2).arc(0, 2, 14, Math.PI, 2 * Math.PI).closePath().fill(fill('science-green', 0.9));
  }
  flaskPath(g);
  g.stroke(OUTLINE);
  g.rect(-6, -27, 12, 4).fill(fill('steel')).stroke(OUTLINE_THIN);
  PACK_KINDS.forEach((_, k) => {
    const [cx, cy] = packCell(k);
    g.rect(cx - 4, cy - 4, 8, 8).fill(fill('hazard-dark')).stroke(line('steel', 1));
  });
  lamp(g, w, h, labLamp(ctx.state, b));
}

// --- Фильтрующий разделитель ---

/** Воронка в точке (cx, cy) поперёк поворота здания: размер size px по ширине, вершиной вниз на экране. */
export function drawFunnel(g: Graphics, cx: number, cy: number, size: number, dir: number): void {
  const k = size / 8;
  const a = (-dir * Math.PI) / 2;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const at = (u: number, v: number): [number, number] => [cx + (u * c - v * s) * k, cy + (u * s + v * c) * k];
  g.poly([...at(-4, -4), ...at(4, -4), ...at(0, 1.5)]).fill(fill('plate-light')).stroke(OUTLINE_THIN);
  g.poly([...at(-1, 1.5), ...at(1, 1.5), ...at(1, 4.5), ...at(-1, 4.5)]).fill(fill('plate-light')).stroke(OUTLINE_THIN);
}

/** Цвет стрелок выходов фильтрующего разделителя; undefined — как у обычного разделителя (фильтра нет). */
export function filterTip(b: BuildingView): ((i: number) => Token) | undefined {
  if (b.filter === undefined) return undefined;
  const held = b.belt?.[0]?.item;
  const next = b.progress === 2 ? 2 : 1;
  return (i) => (i === 0 ? (held === b.filter ? 'ok' : 'rust-light') : held !== undefined && held !== b.filter && i === next ? 'hazard' : 'rust-light');
}

/** Воронка поверх ромба: по центру без фильтра, 5 px в заднем левом углу клетки с фильтром. */
export function drawFilterMark(g: Graphics, b: BuildingView): void {
  if (b.filter === undefined) drawFunnel(g, 0, -1, 8, b.dir);
  else drawFunnel(g, -8, 9, 5, b.dir);
}
