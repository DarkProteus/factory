import { applyCommand, createState, hash, tick, type Command, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
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
  for (const [item, count] of [['drill', 1], ['belt', 3], ['inserter', 2], ['furnace', 1], ['chest', 1]] as const) {
    state.inventory.push({ item, count });
  }
  const cmds: Command[] = [
    { type: 'build', building: 'drill', x: 0, y: 0, dir: 1 },
    ...[2, 3, 4].map((x): Command => ({ type: 'build', building: 'belt', x, y: 0, dir: 1 })),
    { type: 'build', building: 'inserter', x: 5, y: 0, dir: 1 },
    { type: 'build', building: 'furnace', x: 6, y: 0, dir: 1 },
    { type: 'build', building: 'inserter', x: 8, y: 0, dir: 1 },
    { type: 'build', building: 'chest', x: 9, y: 0, dir: 1 },
  ];
  for (const c of cmds) applyCommand(state, c);
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
});
