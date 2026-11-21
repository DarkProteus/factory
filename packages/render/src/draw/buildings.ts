// Здания по docs/style.md. Каждое рисуется в ориентации N с центром в (0, 0),
// Graphics здания повёрнут на dir × 90°. Предметы рисует слой предметов.
import type { BuildingDef } from '@factory/content';
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import { CELL, palette, SHADOW_ALPHA } from '../palette';
import { satisfactionOf } from '../powerView';
import { beltBed, beltChevrons, drawFilterMark, drawLab, drawUnderground, fastInserterMark, filterTip, isFast } from './m3';
import { drawAssembler, drawGenerator, drawPole, drawSplitter, outOfFuel } from './buildingsM2';
import { body, fill, hazardStripes, lamp, line, OUTLINE, OUTLINE_THIN, rectPts, rivets, rust, type LampState } from './shapes';

export type BuildingView = ViewState['buildings'][number];

export interface FrameCtx {
  state: ViewState;
  /** Тик текущего состояния и доля пути до следующего, 0..1. */
  tick: number;
  alpha: number;
  /** Угол руки манипулятора (0 — вперёд, π — назад), считает renderer. */
  armAngle: (b: BuildingView, def: BuildingDef) => number;
  /** Порталы подземных рисует сцена отдельным слоем над предметами; здание рисует только ленту. */
  portalsApart?: boolean;
}

/** Размер здания в px в ориентации N. */
export function localSize(def: BuildingDef): [number, number] {
  return [def.size[0] * CELL, def.size[1] * CELL];
}

/** Центр отпечатка в мире и размер в ориентации N для здания с якорем (x, y) и направлением dir. */
export function placement(def: BuildingDef, x: number, y: number, dir: number): [number, number, number, number] {
  const [w, h] = localSize(def);
  const [fw, fh] = dir % 2 === 1 ? [h, w] : [w, h];
  return [x * CELL + fw / 2, y * CELL + fh / 2, w, h];
}

export function drawBuilding(g: Graphics, b: BuildingView, def: BuildingDef, ctx: FrameCtx): void {
  const [w, h] = localSize(def);
  switch (def.behavior) {
    case 'miner':
      return drawDrill(g, b, def, ctx, w, h);
    case 'belt':
      return drawBelt(g, def, ctx, w, h);
    case 'inserter':
      return drawInserter(g, b, def, ctx);
    case 'crafter':
      return def.recipeMode === 'chosen' ? drawAssembler(g, b, ctx, w, h) : drawFurnace(g, b, def, ctx, w, h);
    case 'splitter':
      return drawSplitter(g, b, w, h);
    case 'filterSplitter':
      drawSplitter(g, b, w, h, filterTip(b));
      return drawFilterMark(g, b);
    case 'underground':
      return drawUnderground(g, b, def, ctx);
    case 'lab':
      return drawLab(g, b, ctx, w, h);
    case 'pole':
      return drawPole(g);
    case 'generator':
      return drawGenerator(g, b, ctx, w, h);
    case 'container':
      return drawChest(g, b);
    default:
      body(g, w, h, 'steel-dark');
  }
}

/** Есть ли залежь под отпечатком (для лампы и вращения бура). */
function hasDeposit(state: ViewState, b: BuildingView, def: BuildingDef): boolean {
  const [w, h] = b.dir % 2 === 1 ? [def.size[1], def.size[0]] : def.size;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (state.map.deposits[(b.y + dy) * state.map.width + b.x + dx]) return true;
    }
  }
  return false;
}

export function drillLamp(state: ViewState, b: BuildingView, def: BuildingDef): LampState {
  // Нет залежи, вне сети или удовлетворённость сети 0 — лампа не горит.
  if (!hasDeposit(state, b, def) || satisfactionOf(state, b.id) === 0) return 'off';
  return (b.output?.count ?? 0) >= (def.buffer ?? 0) ? 'wait' : 'work';
}

function drawDrill(g: Graphics, b: BuildingView, def: BuildingDef, ctx: FrameCtx, w: number, h: number): void {
  body(g, w, h, 'steel-dark');
  g.rect(-w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7).stroke(line('steel', 3));
  rust(g, b.id, w, h);
  rivets(g, w, h, 6);
  // Жёлоб над клеткой выдачи: при N и E это левая клетка переднего края, при S и W — правая.
  const cx = b.dir < 2 ? -w / 2 + CELL / 2 : w / 2 - CELL / 2;
  const top = -h / 2 + 2;
  hazardStripes(g, [
    [cx - 10, top],
    [cx - 6, top - 6],
    [cx + 6, top - 6],
    [cx + 10, top],
  ]);
  const state = drillLamp(ctx.state, b, def);
  g.circle(0, 0, 17).fill(fill('rust')).stroke(OUTLINE);
  const turn = state === 'work' ? (b.progress + ctx.alpha) / (def.miningTicks ?? 1) : b.progress / (def.miningTicks ?? 1);
  for (let i = 0; i < 3; i++) {
    const a = turn * Math.PI * 2 + (i * Math.PI * 2) / 3;
    g.moveTo(0, 0).lineTo(Math.sin(a) * 14, -Math.cos(a) * 14);
  }
  g.stroke(line('steel-light', 3, { cap: 'round' }));
  lamp(g, w, h, state);
}

function drawBelt(g: Graphics, def: BuildingDef, ctx: FrameCtx, w: number, h: number): void {
  beltBed(g, -h / 2, h / 2);
  beltChevrons(g, ctx, def, -h / 2, h / 2);
}

function drawInserter(g: Graphics, b: BuildingView, def: BuildingDef, ctx: FrameCtx): void {
  g.circle(0, 0, 10).fill(fill('steel-dark')).stroke(OUTLINE);
  g.circle(0, 0, 8).stroke(line('steel', 2));
  const fast = isFast(def);
  g.poly([0, -10, -3, -5, 3, -5]).fill(fill(fast ? 'fast' : 'hazard'));
  if (fast) fastInserterMark(g);
  const a = ctx.armAngle(b, def);
  const [sin, cos] = [Math.sin(a), Math.cos(a)];
  // Рука 5×15 от шарнира, повёрнутая на угол a (0 — вперёд, вверх).
  const local: [number, number][] = rectPts(-2.5, -15, 5, 15);
  hazardStripes(
    g,
    local.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]),
    4,
    OUTLINE_THIN,
  );
  g.circle(0, 0, 3).fill(fill('steel-light')).stroke(OUTLINE_THIN);
}

/** Конец руки манипулятора в локальных координатах (для иконки предмета). */
export function armTip(angle: number): [number, number] {
  return [Math.sin(angle) * 13, -Math.cos(angle) * 13];
}

/** Стоимость одного тика работы печи в единицах burn (Вт·тик): kw × 1000, см. sim/fuel.ts. */
function fuelCost(def: BuildingDef): number {
  return (def.energy?.kw ?? 0) * 1000;
}

export function furnaceLamp(b: BuildingView, def: BuildingDef): LampState {
  // Нет топлива: цикл не может ни начаться, ни продолжиться.
  if (def.fuelSlot && outOfFuel(b, fuelCost(def))) return 'off';
  if (b.progress > 0) return 'work';
  const empty = (b.input ?? []).every((s) => s.count === 0);
  return b.recipe === undefined && empty ? 'off' : 'wait';
}

function drawFurnace(g: Graphics, b: BuildingView, def: BuildingDef, ctx: FrameCtx, w: number, h: number): void {
  const state = furnaceLamp(b, def);
  body(g, w, h, 'rust-dark');
  const x0 = -w / 2 + 2;
  const y0 = -h / 2 + 2;
  for (let row = 0, y = y0; y < h / 2 - 2; row++, y += 6) {
    if (y > y0) g.moveTo(x0, y).lineTo(w / 2 - 2, y);
    for (let x = x0 + (row % 2 ? 6 : 12); x < w / 2 - 2; x += 12) g.moveTo(x, y).lineTo(x, Math.min(y + 6, h / 2 - 2));
  }
  g.stroke(line('rust', 1));
  g.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4).stroke(OUTLINE);
  g.rect(-13, -13, 26, 26).fill(fill('hazard-dark')).stroke(line('steel', 3));
  if (state === 'work') {
    g.rect(-10, -10, 20, 20).fill(fill('heat-1'));
    g.rect(-6, -6, 12, 12).fill(fill('heat-2', 0.75 + 0.25 * Math.sin((ctx.tick + ctx.alpha) * 0.2)));
  }
  g.rect(w / 2 - 16, h / 2 - 16, 10, 10).fill(fill('steel')).stroke(OUTLINE_THIN);
  g.rect(w / 2 - 14, h / 2 - 14, 6, 6).fill(fill('hazard-dark'));
  g.rect(-w / 2 + 2, -h / 2 + 2, w - 4, 4).fill(fill('hazard')).stroke(OUTLINE_THIN);
  lamp(g, w, h, state);
}

function drawChest(g: Graphics, b: BuildingView): void {
  g.rect(-13, -13, 26, 26).fill(fill('steel')).stroke(OUTLINE);
  g.rect(-12, -12, 24, 24).stroke(line('steel-dark', 2));
  g.moveTo(-10, -10).lineTo(10, 10).moveTo(10, -10).lineTo(-10, 10);
  g.stroke(line('steel-light', 3));
  rust(g, b.id, 26, 26);
  rivets(g, 26, 26, 4);
}

/** Тень корпуса в мировых координатах: та же форма, смещение (+3, +3). Конвейер плоский, без тени. */
export function drawShadow(g: Graphics, def: BuildingDef, cx: number, cy: number, w: number, h: number): void {
  const color = { color: palette.shadow, alpha: SHADOW_ALPHA };
  if (def.behavior === 'belt' || def.behavior === 'underground') return;
  if (def.behavior === 'splitter' || def.behavior === 'filterSplitter') {
    const d = 8 * Math.SQRT2;
    g.poly([cx + 3, cy - d + 3, cx + d + 3, cy + 3, cx + 3, cy + d + 3, cx - d + 3, cy + 3]).fill(color);
  } else if (def.behavior === 'pole') {
    g.rect(cx - 5 + 3, cy - 5 + 3, 10, 10).fill(color);
    g.rect(cx - 11 + 3, cy - 2 + 3, 22, 4).fill(color);
  } else if (def.behavior === 'inserter') g.circle(cx + 3, cy + 3, 10).fill(color);
  else if (def.behavior === 'container') g.rect(cx - 10, cy - 10, 26, 26).fill(color);
  else g.rect(cx - w / 2 + 5, cy - h / 2 + 5, w - 4, h - 4).fill(color);
}
