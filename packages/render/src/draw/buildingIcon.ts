// Предмет-здание: форма здания с карты в ориентации N, вписанная в квадрат size px.
import { buildings as contentBuildings } from '@factory/content';
import type { Graphics } from 'pixi.js';
import type { ViewState } from '../interp';
import { drawBuilding, localSize, type BuildingView } from './buildings';
import { withGhost } from './shapes';

/** Пустая карта 1×1: иконке нужна только форма, лампы получаются «выкл». */
const EMPTY = { tick: 0, buildings: {}, map: { width: 1, height: 1, deposits: [null] } } as unknown as ViewState;

/** Рисует здание id с центром в (x, y); false, если такого здания нет. */
export function drawBuildingIcon(g: Graphics, id: string, x: number, y: number, size: number): boolean {
  const def = contentBuildings[id as keyof typeof contentBuildings];
  if (!def) return false;
  const [w, h] = localSize(def);
  const view: BuildingView = { id: 0, type: id, x: 0, y: 0, dir: 0, progress: 0, output: null };
  const ctx = { state: EMPTY, tick: 0, alpha: 0, armAngle: () => Math.PI };
  g.context.save();
  // Матрица в Pixi умножается «после»: сначала масштаб, потом сдвиг (иначе сдвиг тоже масштабируется).
  g.context.scale(size / Math.max(w, h));
  g.context.translate(x, y);
  withGhost(null, () => drawBuilding(g, view, def, ctx));
  g.context.restore();
  return true;
}
