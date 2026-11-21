import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { labCanAccept, labUnitStacks, releaseLabUnits } from './lab';
import { electrify, stocked } from './testKit';

const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });

/** Мир с одной лабораторией в (0,0); electrify включает сеть уже после раскладки. */
function world(): { state: SimState; lab: PlacedBuilding } {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, [build('lab', 0, 0)]);
  electrify(state);
  return { state, lab: buildingAt(state, 0, 0)! };
}

const set = (state: SimState, tech: string): void => applyCommand(state, { type: 'setResearch', tech } as Command);

describe('lab: неизвестная технология', () => {
  it('единица неизвестной технологии не даёт пакетов, активная неизвестная ничего не принимает', () => {
    const { lab } = world();
    lab.unit = 'bogus';
    expect(labUnitStacks(lab)).toEqual([]);
    expect(labCanAccept(lab, 'sciencePackRed', 'bogus')).toBe(false);
    expect(labCanAccept(lab, 'sciencePackRed', undefined)).toBe(false);
    expect(labCanAccept(lab, 'sciencePackRed', null)).toBe(false);
  });
});

describe('lab: возврат пакетов единицы (releaseLabUnits)', () => {
  it('нет ячеек входа: пакеты возвращаются в новую ячейку', () => {
    const { state, lab } = world();
    state.research.active = 'scienceGreen';
    lab.unit = 'logistics';
    lab.progress = 5;
    releaseLabUnits(state);
    expect(lab.input).toEqual([{ item: 'sciencePackRed', count: 1 }]);
    expect(lab.unit).toBeUndefined();
    expect(lab.progress).toBe(0);
  });

  it('есть ячейка другого пакета: пакеты единицы добавляются отдельным стеком', () => {
    const { state, lab } = world();
    state.research.active = 'scienceGreen';
    lab.unit = 'logistics';
    lab.input = [{ item: 'sciencePackGreen', count: 3 }];
    releaseLabUnits(state);
    expect(lab.input).toEqual([
      { item: 'sciencePackGreen', count: 3 },
      { item: 'sciencePackRed', count: 1 },
    ]);
  });

  it('единица активной технологии не возвращается', () => {
    const { state, lab } = world();
    state.research.active = 'logistics';
    lab.unit = 'logistics';
    lab.progress = 5;
    releaseLabUnits(state);
    expect(lab.unit).toBe('logistics');
    expect(lab.progress).toBe(5);
    expect(lab.input).toBeUndefined();
  });

  it('здание без единицы не трогается', () => {
    const { state, lab } = world();
    state.research.active = 'scienceGreen';
    lab.progress = 7;
    releaseLabUnits(state);
    expect(lab.progress).toBe(7);
    expect(lab.input).toBeUndefined();
  });
});

describe('lab: старт единицы', () => {
  it('пакетов ровно на единицу: стартует, а пакеты уже списаны и идущая единица продолжается', () => {
    const { state, lab } = world();
    set(state, 'logistics');
    lab.input = [{ item: 'sciencePackRed', count: 1 }];
    tick(state, []);
    expect(lab.unit).toBe('logistics');
    expect(lab.input).toEqual([{ item: 'sciencePackRed', count: 0 }]);
    expect(lab.progress).toBe(1);
    tick(state, []);
    tick(state, []);
    expect(lab.progress).toBe(3);
    expect(state.research.progress.logistics!.ticks).toBe(3);
  });

  it('не хватает одного из двух видов пакетов: единица не стартует, пакеты на месте', () => {
    const { state, lab } = world();
    state.research.active = 'fastInserter';
    lab.input = [
      { item: 'sciencePackRed', count: 1 },
      { item: 'sciencePackGreen', count: 0 },
    ];
    tick(state, []);
    tick(state, []);
    expect(lab.unit).toBeUndefined();
    expect(lab.progress).toBe(0);
    expect(lab.input).toEqual([
      { item: 'sciencePackRed', count: 1 },
      { item: 'sciencePackGreen', count: 0 },
    ]);
    expect(state.research.progress.fastInserter?.ticks ?? 0).toBe(0);
  });

  it('без активной технологии прогресс простаивающей лаборатории не меняется', () => {
    const { state, lab } = world();
    lab.progress = 7;
    tick(state, []);
    expect(lab.progress).toBe(7);
  });
});
