import { describe, expect, it } from 'vitest';
import { Camera, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './camera';

function camera(): Camera {
  const c = new Camera();
  c.resize(800, 600);
  return c;
}

describe('камера', () => {
  it('панорама двигает мир вслед за курсором', () => {
    const c = camera();
    c.zoom = 2;
    const before = c.worldToScreen(100, 100);
    c.panScreen(40, -20);
    const after = c.worldToScreen(100, 100);
    expect(after[0] - before[0]).toBeCloseTo(40);
    expect(after[1] - before[1]).toBeCloseTo(-20);
  });

  it('шаг колеса меняет зум в ZOOM_STEP раз, точка под курсором остаётся на месте', () => {
    const c = camera();
    const world = c.screenToWorld(600, 150);
    c.zoomAt(1, 600, 150);
    expect(c.zoom).toBeCloseTo(ZOOM_STEP);
    const screen = c.worldToScreen(...world);
    expect(screen[0]).toBeCloseTo(600);
    expect(screen[1]).toBeCloseTo(150);
  });

  it('зум ограничен минимумом и максимумом', () => {
    const c = camera();
    for (let i = 0; i < 50; i++) c.zoomAt(1, 400, 300);
    expect(c.zoom).toBe(ZOOM_MAX);
    for (let i = 0; i < 50; i++) c.zoomAt(-1, 400, 300);
    expect(c.zoom).toBe(ZOOM_MIN);
  });

  it('screenToWorld и worldToScreen взаимно обратны', () => {
    const c = camera();
    c.x = 123;
    c.y = -45;
    c.setZoom(1.7);
    const [sx, sy] = c.worldToScreen(...c.screenToWorld(10, 590));
    expect(sx).toBeCloseTo(10);
    expect(sy).toBeCloseTo(590);
  });
});
