// Здания M2 по docs/style.md: разделитель, сборщик, столб, генератор.
// Как и в buildings.ts, всё рисуется в ориентации N с центром в (0, 0).
import { recipes } from '@factory/content';
import { splitterNextOutput } from '@factory/sim';
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import type { Token } from '../palette';
import { generatorLoadOf, satisfactionOf } from '../powerView';
import type { BuildingView, FrameCtx } from './buildings';
import { body, fill, line, lamp, OUTLINE, OUTLINE_THIN, rivets, rust, type LampState } from './shapes';

/**
 * Индекс выхода разделителя, на который пойдёт следующий предмет: 0 — перед, 1 — лево, 2 — право.
 * Правило общее с sim (splitterNextOutput); очередь выходов хранится в b.progress.
 */
export function splitterNext(b: Pick<BuildingView, 'progress'>): number {
  return splitterNextOutput(b, '');
}

/** Нагрузка генератора, 0..1: min(выработка, спрос) / выработка его сети (powerStats). */
export function generatorLoad(state: ViewState, b: BuildingView): number {
  return generatorLoadOf(state, b.id);
}

/** Топливо кончилось: ячейка пуста и остаток сожжённой энергии меньше стоимости одного тика (cost, Вт·тик). */
export function outOfFuel(b: BuildingView, cost = 1): boolean {
  return !b.fuel && (b.burn ?? 0) < cost;
}

/** Предмет, который собирает сборщик по выбранному рецепту (первый выход), или undefined. */
export function assemblerProduct(b: BuildingView): string | undefined {
  const recipe = b.recipe === undefined ? undefined : (recipes as Record<string, { out: Record<string, number> }>)[b.recipe];
  return recipe && Object.keys(recipe.out)[0];
}

export function assemblerLamp(state: ViewState, b: BuildingView): LampState {
  if (b.recipe === undefined || satisfactionOf(state, b.id) === 0) return 'off';
  return b.progress > 0 ? 'work' : 'wait';
}

export function generatorLamp(state: ViewState, b: BuildingView): LampState {
  if (outOfFuel(b)) return 'off';
  return generatorLoad(state, b) > 0 ? 'work' : 'wait';
}

/** Полоса 4 px `hazard` вдоль переднего края корпуса. */
function frontStrip(g: Graphics, w: number, h: number): void {
  g.rect(-w / 2 + 2, -h / 2 + 2, w - 4, 4).fill(fill('hazard')).stroke(OUTLINE_THIN);
}

/** tipToken — цвет стрелки выхода i (0 — перед, 1 — лево, 2 — право); по умолчанию подсвечен первый. */
export function drawSplitter(g: Graphics, b: BuildingView, w: number, h: number, tipToken?: (i: number) => Token): void {
  // Вход: полотно и рельсы конвейера на задней половине клетки.
  g.rect(-w / 2 + 3, 0, w - 6, h / 2).fill(fill('hazard-dark'));
  for (const x of [-w / 2, w / 2 - 3]) g.rect(x, 0, 3, h / 2).fill(fill('steel')).stroke(OUTLINE_THIN);
  // Корпус: ромб — квадрат 16 px, повёрнутый на 45°.
  const d = 8 * Math.SQRT2;
  g.poly([0, -d, d, 0, 0, d, -d, 0]).fill(fill('steel')).stroke(OUTLINE);
  g.circle(0, 0, 1.5).fill(fill('steel-light'));
  // Выходы: перед, лево, право; на какой пойдёт следующий предмет, тот `hazard`.
  const next = splitterNext(b);
  const edge = w / 2;
  const tips: [number, number, number][] = [
    [0, -edge, -Math.PI / 2],
    [-edge, 0, Math.PI],
    [edge, 0, 0],
  ];
  tips.forEach(([tx, ty, a], i) => {
    const [c, s] = [Math.cos(a), Math.sin(a)];
    // Треугольник высотой 6 px и шириной 6 px, вершиной наружу (вдоль направления a).
    const pts = [
      [0, 0],
      [-6, -3],
      [-6, 3],
    ].flatMap(([u, v]) => [tx - c * 0.5 + u! * c - v! * s, ty - s * 0.5 + u! * s + v! * c]);
    g.poly(pts).fill(fill(tipToken ? tipToken(i) : i === next ? 'hazard' : 'rust-light')).stroke(OUTLINE_THIN);
  });
}

export function drawAssembler(g: Graphics, b: BuildingView, ctx: FrameCtx, w: number, h: number): void {
  body(g, w, h, 'steel-dark');
  g.rect(-w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7).stroke(line('steel', 3));
  rust(g, b.id, w, h);
  rivets(g, w, h);
  // Окно: иконку продукта рисует сцена поверх (она не должна поворачиваться со зданием).
  g.rect(-22, -22, 44, 44).fill(fill('hazard-dark')).stroke(line('steel', 3));
  const working = assemblerLamp(ctx.state, b) === 'work';
  if (working) {
    const alpha = 0.5 + 0.5 * Math.sin((ctx.tick + ctx.alpha) * 0.3);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.rect(sx * 17 - 2, sy * 17 - 2, 4, 4).fill(fill('heat-2', alpha));
  }
  frontStrip(g, w, h);
  lamp(g, w, h, assemblerLamp(ctx.state, b));
}

export function drawPole(g: Graphics): void {
  g.rect(-5, -5, 10, 10).fill(fill('steel-dark')).stroke(OUTLINE_THIN);
  g.rect(-11, -2, 22, 4).fill(fill('steel')).stroke(OUTLINE_THIN);
  for (const x of [-11, 11]) g.circle(x, 0, 2.5).fill(fill('plate-light')).stroke(OUTLINE_THIN);
}

export function drawGenerator(g: Graphics, b: BuildingView, ctx: FrameCtx, w: number, h: number): void {
  body(g, w, h, 'steel-dark');
  g.rect(-w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7).stroke(line('steel', 3));
  rust(g, b.id, w, h);
  rivets(g, w, h);
  // Маховик: оборот за 120 тиков при полной нагрузке, медленнее пропорционально нагрузке.
  const turn = ((ctx.tick + ctx.alpha) / 120) * generatorLoad(ctx.state, b) * Math.PI * 2;
  g.circle(0, 0, 22).fill(fill('steel')).stroke(OUTLINE);
  for (let i = 0; i < 6; i++) {
    const a = turn + (i * Math.PI) / 3;
    g.moveTo(0, 0).lineTo(Math.sin(a) * 20, -Math.cos(a) * 20);
  }
  g.stroke(line('steel-light', 3));
  g.circle(0, 0, 5).fill(fill('steel-light')).stroke(OUTLINE_THIN);
  // Топка в заднем левом углу; светится, пока в ней горит топливо.
  g.rect(-31, 17, 14, 14).fill(fill('hazard-dark')).stroke(line('steel', 2));
  if ((b.burn ?? 0) > 0) g.rect(-28, 20, 8, 8).fill(fill('heat-1'));
  frontStrip(g, w, h);
  lamp(g, w, h, generatorLamp(ctx.state, b));
}
