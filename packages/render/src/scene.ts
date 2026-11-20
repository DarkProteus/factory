// Сцена: слои мира и их обновление по состоянию sim. Состояние только читается.
import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { Container, Graphics } from 'pixi.js';
import type { Camera } from './camera';
import { assemblerProduct } from './draw/buildingsM2';
import { drawBuilding, drawShadow, placement, type BuildingView, type FrameCtx, armTip } from './draw/buildings';
import { DepositLayer, drawGround } from './draw/ground';
import { drawItem } from './draw/items';
import { OverlayLayer, type Overlay } from './overlay';
import { beltItemPos, captureBelts, type BeltSnapshot, type ViewState } from './interp';
import { CELL } from './palette';
import { PowerLayer } from './powerDraw';
import { BELT_CELL } from '@factory/sim';

/** Зум, ниже которого предметы рисуются кругами. */
const ITEM_LOD_ZOOM = 0.75;
/** Иконка предмета на конвейере: шаг BELT_GAP = 8 px, крупнее — перекрытие (style.md). */
const BELT_ICON = 8;
/** Возврат руки манипулятора после укладки, тиков (только анимация). */
const ARM_RETURN_TICKS = 6;

type Defs = Readonly<Record<string, BuildingDef>>;

export class Scene {
  readonly world = new Container();
  private ground = new Graphics();
  private deposits = new DepositLayer(new Graphics());
  private shadows = new Graphics();
  /** Конвейеры ниже остальных зданий: жёлоб бура лежит поверх конвейера перед ним. */
  private buildingLayer = new Container({ sortableChildren: true });
  private items = new Graphics();
  private byId = new Map<number, Graphics>();
  private snapshot: BeltSnapshot = new Map();
  private groundFor: unknown = null;
  /** Манипуляторы: держал ли предмет на прошлом кадре и тик укладки. */
  private held = new Map<number, boolean>();
  private placedAt = new Map<number, number>();
  private overlay: OverlayLayer;
  private power: PowerLayer;
  private overlayState: Overlay | null = null;

  constructor(private defs: Defs = contentBuildings) {
    this.overlay = new OverlayLayer(defs);
    this.power = new PowerLayer(defs);
    this.world.addChild(
      this.ground,
      this.deposits.graphics,
      this.overlay.grid,
      this.power.zones,
      this.shadows,
      this.buildingLayer,
      this.items,
      this.power.wires,
      this.overlay.top,
      this.power.badges,
    );
  }

  /** Оверлей стройки на следующие кадры; null — убрать. */
  setOverlay(overlay: Overlay | null): void {
    this.overlayState = overlay;
  }

  /** Вызывать перед каждым tick(): запоминает позиции предметов для интерполяции. */
  beforeTick(state: ViewState): void {
    this.snapshot = captureBelts(state);
  }

  update(state: ViewState, alpha: number, camera: Camera): void {
    this.world.scale.set(camera.zoom);
    this.world.position.set(camera.width / 2 - camera.x * camera.zoom, camera.height / 2 - camera.y * camera.zoom);
    if (this.groundFor !== state.map) {
      this.ground.clear();
      drawGround(this.ground, state.map);
      this.groundFor = state.map;
    }
    this.deposits.update(state.map);
    const ctx: FrameCtx = { state, tick: state.tick, alpha, armAngle: (b, def) => this.armAngle(state, b, def, alpha) };
    this.shadows.clear();
    this.items.clear();
    const lod = camera.zoom < ITEM_LOD_ZOOM;
    const seen = new Set<number>();
    for (const b of Object.values(state.buildings)) {
      const def = this.defs[b.type];
      if (!def) continue;
      seen.add(b.id);
      const [cx, cy, w, h] = this.place(b, def);
      drawShadow(this.shadows, def, cx, cy, w, h);
      const g = this.graphicsFor(b.id);
      g.position.set(cx, cy);
      g.zIndex = def.behavior === 'belt' ? 0 : 1;
      // Столб направления не имеет и не поворачивается.
      g.rotation = def.behavior === 'pole' ? 0 : (b.dir * Math.PI) / 2;
      g.clear();
      drawBuilding(g, b, def, ctx);
      this.drawContents(b, def, ctx, cx, cy, lod);
    }
    for (const [id, g] of this.byId) {
      if (seen.has(id)) continue;
      g.destroy();
      this.byId.delete(id);
      this.held.delete(id);
      this.placedAt.delete(id);
    }
    this.overlay.update(this.overlayState, state);
    this.power.update(state, this.overlayState, state.tick + alpha);
  }

  /** Центр отпечатка в мире и размер в ориентации N. */
  private place(b: BuildingView, def: BuildingDef): [number, number, number, number] {
    return placement(def, b.x, b.y, b.dir);
  }

  private graphicsFor(id: number): Graphics {
    let g = this.byId.get(id);
    if (!g) {
      g = new Graphics();
      this.byId.set(id, g);
      this.buildingLayer.addChild(g);
    }
    return g;
  }

  private armAngle(state: ViewState, b: BuildingView, def: BuildingDef, alpha: number): number {
    const swing = def.swingTicks ?? 1;
    if (b.output) {
      this.held.set(b.id, true);
      return Math.PI * (1 - Math.min(1, (b.progress + alpha) / swing));
    }
    if (this.held.get(b.id)) this.placedAt.set(b.id, state.tick);
    this.held.set(b.id, false);
    const at = this.placedAt.get(b.id);
    if (at === undefined) return Math.PI;
    return Math.PI * Math.min(1, (state.tick - at + alpha) / ARM_RETURN_TICKS);
  }

  /** Предметы здания в мировых координатах: на конвейере, в руке, в сундуке. */
  private drawContents(b: BuildingView, def: BuildingDef, ctx: FrameCtx, cx: number, cy: number, lod: boolean): void {
    const rot = (lx: number, ly: number): [number, number] => {
      const a = (b.dir * Math.PI) / 2;
      return [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)];
    };
    if (b.belt) {
      const prev = this.snapshot.get(b.id);
      for (const it of b.belt) {
        const p = beltItemPos(prev, it.item, it.pos, def.beltSpeed ?? 0, ctx.alpha);
        drawItem(this.items, it.item, ...rot(0, CELL / 2 - (p / BELT_CELL) * CELL), BELT_ICON, lod);
      }
    } else if (def.behavior === 'inserter' && b.output) {
      drawItem(this.items, b.output.item, ...rot(...armTip(ctx.armAngle(b, def))), 10, lod);
    } else if (def.behavior === 'container' && b.slots?.[0]) {
      drawItem(this.items, b.slots[0].item, cx, cy, 10, lod);
    } else if (def.behavior === 'splitter' && b.output) {
      drawItem(this.items, b.output.item, cx, cy, 8, lod);
    } else if (def.behavior === 'crafter' && def.recipeMode === 'chosen') {
      // Продукт рецепта в окне сборщика: иконка 24 px не поворачивается со зданием и не уменьшается до круга.
      const product = assemblerProduct(b);
      if (product) drawItem(this.items, product, cx, cy, 24);
    }
  }
}
