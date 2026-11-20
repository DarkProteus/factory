import { items as contentItems, buildings as contentBuildings } from '@factory/content';
import { Graphics } from 'pixi.js';
import { applyCommand, createState, hash, tick, type Command, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
import { drawItem } from './draw/items';
import { Scene } from './scene';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** Небольшой завод со всеми зданиями M1: бур, конвейеры, манипуляторы, печь, сундук. */
function factory(): SimState {
  const deposits = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) deposits.push({ x, y, item: 'ironOre', amount: 100 });
  const state = createState(1, { width: 16, height: 8, deposits });
  // Постройка тратит предмет-здание.
  for (const [item, count] of [['drill', 1], ['belt', 3], ['inserter', 2], ['furnace', 1], ['chest', 1], ['pole', 2], ['generator', 1]] as const) {
    state.inventory.push({ item, count });
  }
  const cmds: Command[] = [
    { type: 'build', building: 'drill', x: 0, y: 0, dir: 1 },
    ...[2, 3, 4].map((x): Command => ({ type: 'build', building: 'belt', x, y: 0, dir: 1 })),
    { type: 'build', building: 'inserter', x: 5, y: 0, dir: 1 },
    { type: 'build', building: 'furnace', x: 6, y: 0, dir: 1 },
    { type: 'build', building: 'inserter', x: 8, y: 0, dir: 1 },
    { type: 'build', building: 'chest', x: 9, y: 0, dir: 1 },
    // Электросеть для бура и манипуляторов.
    { type: 'build', building: 'pole', x: 3, y: 2, dir: 0 },
    { type: 'build', building: 'pole', x: 8, y: 2, dir: 0 },
    { type: 'build', building: 'generator', x: 0, y: 3, dir: 0 },
  ];
  for (const c of cmds) applyCommand(state, c);
  Object.values(state.buildings).find((b) => b.type === 'generator')!.fuel = { item: 'coal', count: 10 };
  return state;
}

describe('сцена', () => {
  it('render не изменяет состояние sim', () => {
    const scene = new Scene();
    const camera = new Camera();
    camera.resize(800, 600);
    const state = factory();
    for (let t = 0; t < 600; t++) {
      scene.beforeTick(state);
      tick(state, []);
      if (t % 50 !== 0) continue;
      const before = hash(state);
      const frozen = deepFreeze(structuredClone(state));
      for (const alpha of [0, 0.5, 0.99]) scene.update(frozen, alpha, camera);
      camera.setZoom(0.6);
      scene.update(frozen, 0.5, camera);
      camera.setZoom(1);
      expect(hash(state)).toBe(before);
    }
    expect(Object.values(state.buildings).some((b) => (b.belt?.length ?? 0) > 0)).toBe(true);
  });

  it('рисует здания, залежи и предметы M2 без исключений, включая нехватку топлива', () => {
    const deposits = ['copperOre', 'coal', 'stone', 'ironOre'].map((item, x) => ({ x, y: 0, item, amount: 100 }));
    const state = createState(1, { width: 24, height: 12, deposits });
    const place = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3 = 0) => {
      state.inventory.push({ item: building, count: 1 });
      applyCommand(state, { type: 'build', building, x, y, dir });
    };
    place('splitter', 0, 2, 1);
    place('assembler', 2, 2);
    place('pole', 6, 2, 2);
    place('generator', 8, 2);
    place('furnace', 12, 2);
    place('furnace', 15, 2);
    for (const b of Object.values(state.buildings)) {
      if (b.type === 'assembler') b.recipe = 'circuit';
      if (b.type === 'splitter') b.output = { item: 'ironPlate', count: 1 };
    }
    // Генератор с топливом и сожжённым остатком, вторая печь с топливом и циклом, первая — без топлива.
    const [gen, f1, f2] = Object.values(state.buildings).filter((b) => ['generator', 'furnace'].includes(b.type));
    gen!.fuel = { item: 'coal', count: 3 };
    gen!.burn = 1000;
    f2!.fuel = { item: 'coal', count: 1 };
    f2!.progress = 10;
    f1!.progress = 5;
    const scene = new Scene();
    const camera = new Camera();
    camera.resize(800, 600);
    for (const zoom of [1, 0.6]) {
      camera.setZoom(zoom);
      scene.update(deepFreeze(structuredClone(state)), 0.5, camera);
    }
    scene.setOverlay({ ghost: { building: 'pole', x: 3, y: 6, dir: 1, valid: true }, grid: true });
    expect(() => scene.update(state, 0, camera)).not.toThrow();
  });

  it('все предметы content рисуются, в том числе предметы-здания и кругом при мелком зуме', () => {
    const g = new Graphics();
    for (const id of [...Object.keys(contentItems), 'unknownItem']) {
      for (const lod of [false, true]) expect(() => drawItem(g, id, 10, 10, 12, lod)).not.toThrow();
    }
    expect(Object.keys(contentBuildings).every((id) => id in contentItems)).toBe(true);
  });
});
