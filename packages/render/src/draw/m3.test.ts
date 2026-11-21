import { buildings } from '@factory/content';
import { applyCommand, createState, hash, tick, BELT_CELL, type SimState } from '@factory/sim';
import { Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { Camera } from '../camera';
import { drawItem } from './items';
import { OverlayLayer } from '../overlay';
import { palette } from '../palette';
import { Scene } from '../scene';
import { chevronToken, filterTip, hiddenByPortal, inTunnel, isFast, labColors, labLamp, PACK_KINDS, tunnelSpans } from './m3';

function world(): SimState {
  const state = createState(1, { width: 16, height: 8 });
  for (const item of ['undergroundBelt', 'fastUndergroundBelt', 'lab', 'fastBelt', 'fastInserter', 'filterSplitter', 'belt', 'pole']) {
    state.inventory.push({ item, count: 4 });
  }
  return state;
}

describe('быстрые версии', () => {
  it('быстрыми считаются лента, подземный и манипулятор с лучшими параметрами', () => {
    expect(isFast(buildings.fastBelt)).toBe(true);
    expect(isFast(buildings.fastUndergroundBelt)).toBe(true);
    expect(isFast(buildings.fastInserter)).toBe(true);
    expect(isFast(buildings.belt)).toBe(false);
    expect(isFast(buildings.undergroundBelt)).toBe(false);
    expect(isFast(buildings.inserter)).toBe(false);
    expect(isFast(buildings.splitter)).toBe(false);
  });

  it('шевроны быстрой ленты берут цвет fast, обычной — rust-light', () => {
    expect(chevronToken(buildings.fastBelt)).toBe('fast');
    expect(chevronToken(buildings.belt)).toBe('rust-light');
  });
});

describe('подземный', () => {
  it('предметы за первой клеткой ленты входа в тоннеле и не рисуются', () => {
    expect(inTunnel(BELT_CELL)).toBe(false);
    expect(inTunnel(BELT_CELL + 1)).toBe(true);
    expect(inTunnel(0)).toBe(false);
  });

  it('портал прячет предмет у края проёма: у входа в конце клетки, у выхода в начале', () => {
    expect(hiddenByPortal('in', 100)).toBe(false);
    expect(hiddenByPortal('in', BELT_CELL)).toBe(true);
    expect(hiddenByPortal('out', 0)).toBe(true);
    expect(hiddenByPortal('out', 100)).toBe(false);
    expect(hiddenByPortal(undefined, 0)).toBe(false);
  });

  it('пролёт пары: клетки между входом и выходом', () => {
    const state = world();
    applyCommand(state, { type: 'build', building: 'undergroundBelt', x: 2, y: 3, dir: 1 });
    applyCommand(state, { type: 'build', building: 'undergroundBelt', x: 5, y: 3, dir: 1 });
    const spans = tunnelSpans(state);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ from: { x: 3, y: 3 }, to: { x: 4, y: 3 }, between: 2 });
    // Одинокий вход и вход рядом с выходом пролёта не дают.
    applyCommand(state, { type: 'build', building: 'undergroundBelt', x: 2, y: 5, dir: 1 });
    applyCommand(state, { type: 'build', building: 'undergroundBelt', x: 3, y: 5, dir: 1 });
    expect(tunnelSpans(state)).toHaveLength(1);
  });

  it('призрак: выход с рамкой пары и вход с подписью', () => {
    const state = world();
    const overlay = new OverlayLayer();
    const ghost = (x: number) => ({ ghost: { building: 'undergroundBelt', x, y: 3, dir: 1 as const, valid: true }, grid: true });
    overlay.update(ghost(2), state);
    // Вход: подпись «вход» показана, рамок нет.
    const label = (overlay as unknown as { label: { visible: boolean }[] | null }).label;
    expect(label?.every((t) => t.visible)).toBe(true);
    applyCommand(state, { type: 'build', building: 'undergroundBelt', x: 2, y: 3, dir: 1 });
    overlay.update(ghost(4), state);
    // Выход: подпись скрыта, у входа-пары рамка и пунктир.
    expect(label?.some((t) => t.visible)).toBe(false);
    expect(overlay.top.children).toHaveLength(4);
  });
});

describe('лаборатория', () => {
  const lab = (state: SimState) => Object.values(state.buildings).find((b) => b.type === 'lab')!;

  it('цвет колбы по пакетам единицы активной технологии, пока лаборатория работает', () => {
    const state = world();
    applyCommand(state, { type: 'build', building: 'lab', x: 4, y: 2, dir: 0 });
    const b = lab(state);
    expect(labColors(state, b)).toBeNull();
    state.research.active = 'logistics';
    expect(labColors(state, b)).toBeNull();
    b.draw = true;
    expect(labColors(state, b)).toEqual(['science-red']);
    state.research.active = 'steel';
    expect(labColors(state, b)).toEqual(['science-red', 'science-green']);
    state.research.active = null;
    expect(labColors(state, b)).toBeNull();
  });

  it('лампа: нет технологии — выкл, нет работы — ждёт, работает — горит', () => {
    const state = world();
    applyCommand(state, { type: 'build', building: 'lab', x: 4, y: 2, dir: 0 });
    applyCommand(state, { type: 'build', building: 'pole', x: 7, y: 3, dir: 0 });
    const b = lab(state);
    expect(labLamp(state, b)).toBe('off');
    state.research.active = 'logistics';
    expect(labLamp(state, b)).toBe('wait');
    b.draw = true;
    expect(labLamp(state, b)).toBe('work');
  });

  it('ячейки пакетов: по одной на красный и зелёный', () => {
    expect(PACK_KINDS).toEqual(['sciencePackRed', 'sciencePackGreen']);
  });
});

describe('фильтрующий разделитель', () => {
  it('без фильтра цвета как у разделителя, с фильтром передний выход ok для подходящего предмета', () => {
    const b = { id: 1, type: 'filterSplitter', x: 0, y: 0, dir: 0, progress: 0, output: null } as Parameters<typeof filterTip>[0];
    expect(filterTip(b)).toBeUndefined();
    const f = { ...b, filter: 'ironPlate', belt: [{ item: 'ironPlate', pos: 0 }] } as Parameters<typeof filterTip>[0];
    expect(filterTip(f)!(0)).toBe('ok');
    const other = { ...f, belt: [{ item: 'coal', pos: 0 }] } as Parameters<typeof filterTip>[0];
    expect(filterTip(other)!(0)).toBe('rust-light');
    expect(filterTip(other)!(1)).toBe('hazard');
  });
});

describe('рисование M3', () => {
  it('предметы M3 рисуются и лодом, и формой', () => {
    for (const item of ['sciencePackRed', 'sciencePackGreen', 'steelPlate']) {
      const g = new Graphics();
      drawItem(g, item, 0, 0, 12);
      drawItem(g, item, 0, 0, 12, true);
      expect(g.context.instructions.length, item).toBeGreaterThan(0);
    }
    expect(palette['steel-plate']).toBe(0x8e9aa6);
  });

  it('сцена с M3-зданиями не меняет состояние sim', () => {
    const state = world();
    const build = (building: string, x: number, y: number, dir = 1) => applyCommand(state, { type: 'build', building, x, y, dir: dir as 0 });
    build('lab', 8, 3, 0);
    build('undergroundBelt', 0, 0);
    build('undergroundBelt', 3, 0);
    build('fastUndergroundBelt', 0, 1);
    build('fastBelt', 5, 1);
    build('fastInserter', 6, 1);
    build('filterSplitter', 7, 1);
    Object.values(state.buildings).find((b) => b.type === 'filterSplitter')!.filter = 'ironPlate';
    state.research.active = 'logistics';
    const scene = new Scene();
    const camera = new Camera();
    camera.resize(800, 600);
    const before = hash(state);
    for (let t = 0; t < 20; t++) {
      scene.beforeTick(state);
      tick(state, []);
      scene.update(state, 0.5, camera);
    }
    const copy = hash(state);
    scene.update(state, 0.5, camera);
    expect(hash(state)).toBe(copy);
    expect(before).not.toBe(copy);
  });
});
