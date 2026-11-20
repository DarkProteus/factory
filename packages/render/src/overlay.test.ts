import { applyCommand, createState, hash } from '@factory/sim';
import { Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
import { OUTLINE, fill, withGhost } from './draw/shapes';
import { buildingRect, drawPreview, gridRect } from './overlay';
import { palette } from './palette';
import { Scene } from './scene';

describe('сетка вокруг призрака', () => {
  it('охватывает отпечаток плюс 6 клеток', () => {
    expect(gridRect({ x: 20, y: 20, w: 2, h: 2 }, 64, 64)).toEqual({ x: 14, y: 14, w: 14, h: 14 });
  });

  it('обрезается краями карты', () => {
    expect(gridRect({ x: 1, y: 62, w: 2, h: 2 }, 64, 64)).toEqual({ x: 0, y: 56, w: 9, h: 8 });
  });
});

describe('рамка под курсором', () => {
  const state = createState(1, { width: 16, height: 16 });
  applyCommand(state, { type: 'build', building: 'drill', x: 4, y: 5, dir: 0 });

  it('берёт весь отпечаток здания по любой его клетке', () => {
    expect(buildingRect(state, 5, 6)).toEqual({ x: 4, y: 5, w: 2, h: 2 });
    expect(buildingRect(state, 4, 5)).toEqual({ x: 4, y: 5, w: 2, h: 2 });
  });

  it('пустая клетка и клетка вне карты — null', () => {
    expect(buildingRect(state, 0, 0)).toBeNull();
    expect(buildingRect(state, -1, 3)).toBeNull();
    expect(buildingRect(state, 16, 3)).toBeNull();
  });
});

describe('режим призрака', () => {
  it('заливки и контуры берут ok или bad с альфой из style.md, снаружи режим выключен', () => {
    withGhost('ok', () => {
      expect(fill('steel')).toEqual({ color: palette.ok, alpha: 0.35 });
      expect(OUTLINE.color).toBe(palette.ok);
      expect(OUTLINE.alpha).toBe(0.8);
    });
    withGhost('bad', () => expect(fill('rust', 0.6).color).toBe(palette.bad));
    expect(fill('steel')).toEqual({ color: palette.steel, alpha: 1 });
    expect(OUTLINE.color).toBe(palette.outline);
  });

  it('режим сбрасывается и после исключения', () => {
    expect(() =>
      withGhost('bad', () => {
        throw new Error('x');
      }),
    ).toThrow();
    expect(fill('steel').color).toBe(palette.steel);
  });
});

describe('оверлей в сцене', () => {
  it('рисуется для каждого здания, не меняя состояние sim', () => {
    const state = createState(1, { width: 16, height: 16 });
    applyCommand(state, { type: 'build', building: 'chest', x: 8, y: 8, dir: 0 });
    const before = hash(state);
    const scene = new Scene();
    const camera = new Camera();
    camera.resize(800, 600);
    for (const building of ['drill', 'belt', 'furnace', 'inserter', 'chest']) {
      for (const valid of [true, false]) {
        scene.setOverlay({
          ghost: { building, x: 3, y: 3, dir: 1, valid },
          highlight: { x: 8, y: 8, demolish: !valid },
          grid: true,
        });
        scene.update(state, 0, camera);
      }
    }
    scene.setOverlay(null);
    scene.update(state, 0, camera);
    expect(hash(state)).toBe(before);
  });

  it('предпросмотр без режима рисует обычными цветами', () => {
    const g = new Graphics();
    const state = createState(1, { width: 4, height: 4 });
    drawPreview(g, 'chest', { size: [1, 1], behavior: 'container', hp: 1 }, state, 0, null);
    expect(g.context.instructions.length).toBeGreaterThan(0);
  });
});
