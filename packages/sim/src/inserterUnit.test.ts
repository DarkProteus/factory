// Манипулятор: электрический и неэлектрический различаются, четыре направления, граничные значения (мутанты TASK-83).
import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { placeBuilding, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import { buildingAt, createState, type SimState } from './index';
import { runInserter } from './inserter';
import { POWER_SCALE } from './power';
import { give } from './testKit';

const SWING = 3;
// Неэлектрический манипулятор: энергии нет вовсе (в content такого нет, поэтому только здесь).
const manual = { size: [1, 1], behavior: 'inserter', hp: 50, swingTicks: SWING } as BuildingDef;
const instant = { ...manual, swingTicks: undefined } as BuildingDef;
const defs = { ...buildings, manual, instant } as BuildingDefs;
const SLOTS = buildings.chest.slots;

interface Rig {
  state: SimState;
  from: PlacedBuilding;
  ins: PlacedBuilding;
  to: PlacedBuilding;
  def: BuildingDef;
}

/** Сундук — манипулятор — сундук в ряд по направлению dir, в сундуке-источнике две пластины. */
function rig(type: string, dir: Dir = 1): Rig {
  const state = give(createState(1, { width: 16, height: 16 }), 'chest', 2);
  give(state, type, 1);
  // Центр (5,5), источник на шаг против dir, цель на шаг по dir.
  const dx = [0, 1, 0, -1][dir]!;
  const dy = [-1, 0, 1, 0][dir]!;
  placeBuilding(state, 'chest', 5 - dx, 5 - dy, 0, defs);
  placeBuilding(state, type, 5, 5, dir, defs);
  placeBuilding(state, 'chest', 5 + dx, 5 + dy, 0, defs);
  const [from, ins, to] = [buildingAt(state, 5 - dx, 5 - dy)!, buildingAt(state, 5, 5)!, buildingAt(state, 5 + dx, 5 + dy)!];
  from.slots = [{ item: 'ironPlate', count: 2 }];
  return { state, from, ins, to, def: defs[type]! };
}

const step = (r: Rig, sat: number | undefined, n = 1): void => {
  for (let i = 0; i < n; i++) runInserter(r.state, r.ins, r.def, defs, sat);
};

describe('манипулятор: направления', () => {
  it.each([0, 1, 2, 3] as Dir[])('dir %i: берёт позади, кладёт впереди', (dir) => {
    const r = rig('manual', dir);
    step(r, undefined, SWING + 1);
    expect(r.from.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    expect(r.ins.output).toBeNull();
  });
});

describe('манипулятор без энергии (неэлектрический)', () => {
  it('работает без сети: берёт сразу, идёт swingTicks, кладёт, спроса не отмечает', () => {
    const r = rig('manual');
    step(r, undefined);
    expect(r.ins.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(r.ins.progress).toBe(0);
    expect(r.from.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    step(r, undefined, SWING - 1);
    expect(r.ins.progress).toBe(SWING - 1);
    expect(r.to.slots).toBeUndefined();
    step(r, undefined);
    expect(r.ins.output).toBeNull();
    expect(r.ins.progress).toBe(0);
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    expect(r.ins.draw).toBeUndefined();
    expect(r.ins.charge).toBeUndefined();
  });

  it('не зависит от удовлетворённости: при нуле идёт так же', () => {
    const r = rig('manual');
    step(r, 0, SWING + 1);
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    expect(r.ins.draw).toBeUndefined();
  });

  it('без swingTicks предмет ложится в следующий же тик после захвата', () => {
    const r = rig('instant');
    step(r, undefined);
    expect(r.ins.output).not.toBeNull();
    step(r, undefined);
    expect(r.ins.output).toBeNull();
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
  });

  it('захват сбрасывает прогресс и кладёт ровно один предмет', () => {
    const r = rig('manual');
    r.ins.progress = 2;
    step(r, undefined);
    expect(r.ins.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(r.ins.progress).toBe(0);
  });

  it('с полной рукой и полной целью ждёт: предмет не теряется, прогресс на swingTicks', () => {
    const r = rig('manual');
    step(r, undefined);
    r.to.slots = Array.from({ length: SLOTS }, () => ({ item: 'ironPlate', count: 100 }));
    step(r, undefined, SWING + 5);
    expect(r.ins.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(r.ins.progress).toBe(SWING);
    r.to.slots.pop();
    step(r, undefined);
    expect(r.ins.output).toBeNull();
  });
});

describe('электрический манипулятор', () => {
  it('вне сети (satisfaction undefined): ничего не берёт и спрос не отмечает', () => {
    const r = rig('inserter');
    step(r, undefined, 5);
    expect(r.ins.output).toBeNull();
    expect(r.from.slots).toEqual([{ item: 'ironPlate', count: 2 }]);
    expect(r.ins.draw).toBeUndefined();
  });

  it('в сети, но без энергии: не берёт, зато спрос отмечен', () => {
    const r = rig('inserter');
    step(r, 0);
    expect(r.ins.output).toBeNull();
    expect(r.ins.draw).toBe(true);
    expect(r.from.slots).toEqual([{ item: 'ironPlate', count: 2 }]);
  });

  it('при любой ненулевой энергии берёт предмет сразу, взмах заряда не требует', () => {
    const r = rig('inserter');
    step(r, 1);
    expect(r.ins.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(r.ins.progress).toBe(0);
    expect(r.ins.draw).toBe(true);
    expect(r.ins.charge).toBeUndefined();
  });

  it('с предметом в руке вне сети взмах стоит', () => {
    const r = rig('inserter');
    r.ins.output = { item: 'ironPlate', count: 1 };
    step(r, undefined, 10);
    expect(r.ins.progress).toBe(0);
    expect(r.ins.draw).toBeUndefined();
    expect(r.ins.output).not.toBeNull();
  });

  it('на полной энергии взмах — swingTicks, затем укладка в тот же тик', () => {
    const r = rig('inserter');
    const swing = buildings.inserter.swingTicks;
    step(r, POWER_SCALE);
    step(r, POWER_SCALE, swing - 1);
    expect(r.ins.progress).toBe(swing - 1);
    expect(r.to.slots).toBeUndefined();
    step(r, POWER_SCALE);
    expect(r.ins.output).toBeNull();
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
  });

  it('на половине энергии взмах вдвое дольше', () => {
    const r = rig('inserter');
    const swing = buildings.inserter.swingTicks;
    const half = POWER_SCALE / 2;
    step(r, half);
    step(r, half, 2 * swing - 1);
    expect(r.ins.progress).toBe(swing - 1);
    expect(r.ins.output).not.toBeNull();
    step(r, half);
    expect(r.ins.output).toBeNull();
    expect(r.to.slots).toEqual([{ item: 'ironPlate', count: 1 }]);
  });

  it('ожидание с завершённым взмахом — простой: спроса нет, заряд не копится', () => {
    const r = rig('inserter');
    r.to.slots = Array.from({ length: SLOTS }, () => ({ item: 'ironPlate', count: 100 }));
    r.ins.output = { item: 'ironPlate', count: 1 };
    r.ins.progress = buildings.inserter.swingTicks;
    step(r, POWER_SCALE, 3);
    expect(r.ins.draw).toBeUndefined();
    expect(r.ins.charge).toBeUndefined();
    expect(r.ins.output).not.toBeNull();
  });

  it('не берёт предмет, который цель не примет', () => {
    const r = rig('inserter');
    r.state.buildings[r.to.id]!.type = 'drill';
    step(r, POWER_SCALE, 5);
    expect(r.ins.output).toBeNull();
    expect(r.from.slots).toEqual([{ item: 'ironPlate', count: 2 }]);
  });

  it('без источника или цели не берёт и спроса не отмечает', () => {
    const r = rig('inserter');
    delete r.state.buildings[r.from.id];
    step(r, POWER_SCALE, 3);
    expect(r.ins.output).toBeNull();
    expect(r.ins.draw).toBeUndefined();
  });
});
