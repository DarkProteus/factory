import type { BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, canPlace, createState, hash } from './index';

const world = () => createState(1, { width: 8, height: 8 });

describe('canPlace', () => {
  it('свободное место внутри карты подходит', () => {
    expect(canPlace(world(), 'belt', 3, 3, 0)).toBe(true);
    expect(canPlace(world(), 'drill', 6, 6, 0)).toBe(true);
  });

  it('вне карты нельзя, в том числе когда отпечаток вылезает за край', () => {
    const state = world();
    expect(canPlace(state, 'belt', -1, 0, 0)).toBe(false);
    expect(canPlace(state, 'belt', 8, 0, 0)).toBe(false);
    expect(canPlace(state, 'drill', 7, 7, 0)).toBe(false);
  });

  it('отпечаток учитывает направление', () => {
    const state = world();
    const defs: Record<string, BuildingDef> = { bar: { size: [3, 1], behavior: 'belt', hp: 1 } };
    expect(canPlace(state, 'bar', 5, 7, 0, defs)).toBe(true);
    expect(canPlace(state, 'bar', 5, 7, 1, defs)).toBe(false);
    expect(canPlace(state, 'bar', 7, 5, 1, defs)).toBe(true);
    expect(canPlace(state, 'bar', 7, 5, 0, defs)).toBe(false);
  });

  it('занятую клетку любой частью отпечатка нельзя', () => {
    const state = world();
    applyCommand(state, { type: 'build', building: 'chest', x: 3, y: 3, dir: 0 });
    expect(canPlace(state, 'belt', 3, 3, 0)).toBe(false);
    expect(canPlace(state, 'drill', 2, 2, 0)).toBe(false);
    expect(canPlace(state, 'drill', 4, 4, 0)).toBe(true);
  });

  it('неизвестный тип и неверное направление нельзя', () => {
    const state = world();
    expect(canPlace(state, 'nope', 0, 0, 0)).toBe(false);
    expect(canPlace(state, 'toString', 0, 0, 0)).toBe(false);
    expect(canPlace(state, 'belt', 0, 0, 4)).toBe(false);
    expect(canPlace(state, 'belt', 0.5, 0, 0)).toBe(false);
  });

  it('не меняет состояние и согласована с командой build', () => {
    const state = world();
    const before = hash(state);
    const ok = canPlace(state, 'drill', 1, 1, 0);
    expect(hash(state)).toBe(before);
    applyCommand(state, { type: 'build', building: 'drill', x: 1, y: 1, dir: 0 });
    expect(ok).toBe(true);
    expect(Object.keys(state.buildings)).toHaveLength(1);
    expect(canPlace(state, 'drill', 1, 1, 0)).toBe(false);
  });
});
