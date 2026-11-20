// Точка входа render: PixiJS-приложение, камера, управление и сцена.
import { Application } from 'pixi.js';
import { Camera } from './camera';
import { attachControls } from './controls';
import type { ViewState } from './interp';
import { CELL, palette } from './palette';
import { Scene } from './scene';

export interface Renderer {
  readonly camera: Camera;
  readonly canvas: HTMLCanvasElement;
  /** Вызывать перед каждым tick() симуляции. */
  beforeTick(state: ViewState): void;
  /** Рисует кадр; alpha — доля пути до следующего тика, 0..1. */
  draw(state: ViewState, alpha: number): void;
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

  return {
    camera,
    canvas: app.canvas,
    beforeTick: (state) => scene.beforeTick(state),
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
