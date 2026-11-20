import { INVENTORY_SLOTS, items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, hash, type SimState } from './index';

function world(): SimState {
  return createState(1, { width: 16, height: 16 });
}

const build = (state: SimState, building: string, x: number, y: number): void =>
  applyCommand(state, { type: 'build', building, x, y, dir: 1 });
const demolish = (state: SimState, x: number, y: number): void => applyCommand(state, { type: 'demolish', x, y });
const count = (state: SimState, item: string): number => state.inventory.filter((s) => s.item === item).reduce((a, s) => a + s.count, 0);

describe('постройка тратит предмет-здание (TASK-17.1)', () => {
  it('build списывает один предмет-здание из инвентаря', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 2 });
    build(state, 'chest', 3, 3);
    expect(buildingAt(state, 3, 3)?.type).toBe('chest');
    expect(count(state, 'chest')).toBe(1);
  });

  it('последний предмет уходит вместе с ячейкой', () => {
    const state = world();
    state.inventory.push({ item: 'drill', count: 1 });
    build(state, 'drill', 2, 2);
    expect(state.inventory).toEqual([]);
  });

  it('без предмета-здания команда игнорируется без изменений', () => {
    const state = world();
    state.inventory.push({ item: 'belt', count: 5 });
    const before = hash(state);
    build(state, 'chest', 3, 3);
    expect(buildingAt(state, 3, 3)).toBeNull();
    expect(hash(state)).toBe(before);
  });

  it('если клетка занята, предмет не списывается', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 2 });
    build(state, 'chest', 3, 3);
    build(state, 'chest', 3, 3);
    expect(count(state, 'chest')).toBe(1);
  });
});

describe('снос возвращает предмет-здание (TASK-17.1)', () => {
  it('пустое здание возвращается предметом в инвентарь', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 1 });
    build(state, 'chest', 3, 3);
    demolish(state, 3, 3);
    expect(buildingAt(state, 3, 3)).toBeNull();
    expect(state.inventory).toEqual([{ item: 'chest', count: 1 }]);
  });

  it('возвращается вместе с содержимым', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 1 });
    build(state, 'chest', 3, 3);
    buildingAt(state, 3, 3)!.slots = [{ item: 'ammo', count: 5 }];
    demolish(state, 3, 3);
    expect(state.inventory).toEqual([
      { item: 'ammo', count: 5 },
      { item: 'chest', count: 1 },
    ]);
  });

  it('место проверяется сразу для всего: не помещается один предмет-здание — снос запрещён', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 1 });
    build(state, 'chest', 3, 3);
    // Все ячейки заняты полными стеками другого вида: предмету-зданию места нет.
    for (let i = 0; i < INVENTORY_SLOTS; i++) state.inventory.push({ item: 'ironPlate', count: items.ironPlate.stack });
    const before = hash(state);
    demolish(state, 3, 3);
    expect(buildingAt(state, 3, 3)).not.toBeNull();
    expect(hash(state)).toBe(before);
  });

  it('предмет-здание дополняет неполную ячейку', () => {
    const state = world();
    state.inventory.push({ item: 'chest', count: 1 });
    build(state, 'chest', 3, 3);
    for (let i = 0; i < INVENTORY_SLOTS - 1; i++) state.inventory.push({ item: 'ironPlate', count: items.ironPlate.stack });
    state.inventory.push({ item: 'chest', count: 1 });
    demolish(state, 3, 3);
    expect(buildingAt(state, 3, 3)).toBeNull();
    expect(count(state, 'chest')).toBe(2);
  });
});
