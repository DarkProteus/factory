// Точка входа render: PixiJS-приложение, камера, управление и сцена.
import { buildings as contentBuildings } from '@factory/content';
import { Application, Graphics } from 'pixi.js';
import { Camera } from './camera';
import { attachControls } from './controls';
import type { ViewState } from './interp';
import { CELL, palette } from './palette';
import { drawPreview, type Overlay } from './overlay';
import { Scene } from './scene';

export interface Renderer {
  readonly camera: Camera;
  readonly canvas: HTMLCanvasElement;
  /** Вызывать перед каждым tick() симуляции. */
  beforeTick(state: ViewState): void;
  /** Рисует кадр; alpha — доля пути до следующего тика, 0..1. */
  draw(state: ViewState, alpha: number): void;
  /** Оверлей стройки (призрак, сетка, рамка); null — убрать. Применяется со следующего draw. */
  setOverlay(overlay: Overlay | null): void;
  /** Иконка здания в ориентации N, вписанная в size px, как data URL (кэшируется). */
  buildingIcon(id: string, size?: number): string;
  /** Ставит камеру в центр клетки (x, y). */
  lookAt(x: number, y: number, zoom?: number): void;
  destroy(): void;
}

export async function createRenderer(host: HTMLElement): Promise<Renderer> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: palette['ground-0'],
    antialias: true,
    autoStart: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  host.appendChild(app.canvas);
  const camera = new Camera();
  const controls = attachControls(app.canvas, camera);
  const scene = new Scene();
  app.stage.addChild(scene.world);
  let last = performance.now();
  const icons = new Map<string, string>();

  return {
    camera,
    canvas: app.canvas,
    beforeTick: (state) => scene.beforeTick(state),
    setOverlay: (overlay) => scene.setOverlay(overlay),
    buildingIcon(id, size = 24) {
      const key = `${id}:${size}`;
      let url = icons.get(key);
      if (url === undefined) icons.set(key, (url = renderIcon(app, id, size)));
      return url;
    },
    draw(state, alpha) {
      const now = performance.now();
      controls.update(now - last);
      last = now;
      camera.resize(app.screen.width, app.screen.height);
      scene.update(state, alpha, camera);
      app.render();
    },
    lookAt(x, y, zoom) {
      camera.x = (x + 0.5) * CELL;
      camera.y = (y + 0.5) * CELL;
      if (zoom !== undefined) camera.setZoom(zoom);
    },
    destroy() {
      controls.detach();
      app.destroy({ removeView: true }, { children: true });
    },
  };
}

/** Рисует здание обычным видом, снимает в канвас и вписывает в квадрат size px (с запасом ×2 для плотных экранов). */
function renderIcon(app: Application, id: string, size: number): string {
  const def = contentBuildings[id as keyof typeof contentBuildings];
  if (!def) return '';
  const g = new Graphics();
  // Иконке нужна только форма: пустая карта 1×1 делает лампы «выкл».
  const empty = { map: { width: 1, height: 1, deposits: [null] } } as unknown as Parameters<typeof drawPreview>[3];
  drawPreview(g, id, def, empty, 0, null);
  const src = app.renderer.extract.canvas({ target: g, resolution: 2 });
  g.destroy();
  const px = size * 2;
  const out = document.createElement('canvas');
  out.width = out.height = px;
  const k = Math.min(px / src.width, px / src.height);
  const [w, h] = [src.width * k, src.height * k];
  out.getContext('2d')!.drawImage(src as CanvasImageSource, (px - w) / 2, (px - h) / 2, w, h);
  return out.toDataURL();
}
