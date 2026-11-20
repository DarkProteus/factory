// Камера: чистая логика без PixiJS и DOM, чтобы тестировать без WebGL.

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
/** Множитель зума за один шаг колеса. */
export const ZOOM_STEP = 1.15;

export class Camera {
  /** Мировая точка (px при зуме 1) в центре экрана. */
  x = 0;
  y = 0;
  zoom = 1;
  /** Размер экрана в px. */
  width = 1;
  height = 1;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Сдвиг на (dx, dy) экранных px: картинка едет вслед за курсором. */
  panScreen(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  }

  /** Зум на steps шагов колеса (положительные — ближе); точка под курсором остаётся на месте. */
  zoomAt(steps: number, sx: number, sy: number): void {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.setZoom(this.zoom * ZOOM_STEP ** steps);
    const [ax, ay] = this.screenToWorld(sx, sy);
    this.x += wx - ax;
    this.y += wy - ay;
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.width / 2) / this.zoom + this.x, (sy - this.height / 2) / this.zoom + this.y];
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x) * this.zoom + this.width / 2, (wy - this.y) * this.zoom + this.height / 2];
  }
}
