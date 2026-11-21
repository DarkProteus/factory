import { technologies } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, canAccept, createState, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { buildings as defs } from '@factory/content';
import { addResearchProgress } from './research';
import { electrify, give, stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3 = 1): Command => ({ type: 'build', building, x, y, dir });
const set = (state: SimState, tech: string): void => applyCommand(state, { type: 'setResearch', tech } as Command);
const open = (state: SimState): boolean => canAccept(buildingAt(state, 0, 0)!, 'sciencePackRed', defs, state.research.unlocked, state.research.active);

/** Мир с лабораториями в (0,0), (4,0), ...; электрифицирован. */
function world(labs = 1): { state: SimState; labs: PlacedBuilding[] } {
  const state = stocked(createState(1, { width: 24, height: 16 }));
  for (let i = 0; i < labs; i++) tick(state, [build('lab', i * 4, 0)]);
  electrify(state);
  return { state, labs: Array.from({ length: labs }, (_, i) => buildingAt(state, i * 4, 0)!) };
}

const put = (state: SimState, lab: PlacedBuilding, item: string, count: number): void => {
  give(state, item, count);
  applyCommand(state, { type: 'putIntoBuilding', building: lab.id, item, count });
};
const cell = (lab: PlacedBuilding, item: string): number => lab.input?.find((s) => s.item === item)?.count ?? 0;
const ticks = (state: SimState, n: number): void => {
  for (let i = 0; i < n; i++) tick(state, []);
};

const LOGISTICS = technologies.logistics;
const TOTAL = LOGISTICS.units * LOGISTICS.unitTicks;

/** Тиков до изучения активной технологии (с запасом); -1, если не изучена. */
function ticksToFinish(state: SimState, tech: string, limit: number): number {
  for (let t = 1; t <= limit; t++) {
    tick(state, []);
    if (state.research.done.includes(tech as never)) return t;
  }
  return -1;
}

describe('лаборатория: исследование', () => {
  it('одна лаборатория проходит технологию за units × unitTicks тиков и тратит units пакетов', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 12);
    const t = ticksToFinish(state, 'logistics', TOTAL + 50);
    expect(Math.abs(t - TOTAL)).toBeLessThanOrEqual(LOGISTICS.unitTicks);
    expect(state.research.unlocked).toContain('splitter');
    ticks(state, 2);
    // Потрачено ровно units пакетов; остаток вернулся в ячейку (идущей единицы нет).
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(2);
    expect(labs[0]!.unit).toBeUndefined();
  });

  it('две лаборатории вдвое быстрее; пакетов уходит те же units', () => {
    const { state, labs } = world(2);
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 10);
    put(state, labs[1]!, 'sciencePackRed', 10);
    const t = ticksToFinish(state, 'logistics', TOTAL);
    expect(Math.abs(t - TOTAL / 2)).toBeLessThanOrEqual(LOGISTICS.unitTicks);
    ticks(state, 2);
    expect(cell(labs[0]!, 'sciencePackRed') + cell(labs[1]!, 'sciencePackRed')).toBe(20 - LOGISTICS.units);
  });

  it('прогресс единицы умножается на удовлетворённость сети', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 3);
    ticks(state, 600);
    const full = state.research.progress.logistics!;
    expect(full.units * LOGISTICS.unitTicks + full.ticks).toBeGreaterThan(500);
    // Убираем топливо генератора: сеть без энергии — прогресс стоит.
    for (const b of Object.values(state.buildings)) if (b.type === 'generator') { delete b.fuel; delete b.burn; }
    const before = { ...state.research.progress.logistics! };
    ticks(state, 100);
    expect(state.research.progress.logistics).toEqual(before);
  });

  it('пакеты единицы списываются при её старте', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 5);
    ticks(state, 3);
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(4);
    expect(labs[0]!.unit).toBe('logistics');
  });
});

describe('лаборатория: приём пакетов', () => {
  it('без активной технологии не принимает ничего', () => {
    const { state, labs } = world();
    expect(open(state)).toBe(false);
    put(state, labs[0]!, 'sciencePackRed', 5);
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(0);
  });

  it('принимает только пакеты активной технологии (манипулятор и ручная перекладка)', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    expect(open(state)).toBe(true);
    const lab = labs[0]!;
    expect(canAccept(lab, 'sciencePackGreen', defs, state.research.unlocked, state.research.active)).toBe(false);
    expect(canAccept(lab, 'ironPlate', defs, state.research.unlocked, state.research.active)).toBe(false);
    put(state, lab, 'sciencePackGreen', 5);
    expect(cell(lab, 'sciencePackGreen')).toBe(0);
    // Манипулятор: сундук с красными и зелёными пакетами справа, лаборатория слева.
    tick(state, [build('chest', 1, 4), build("inserter", 1, 3, 0)]);
    const chest = buildingAt(state, 1, 4)!;
    chest.slots = [{ item: 'sciencePackGreen', count: 5 }, { item: 'sciencePackRed', count: 5 }];
    electrify(state);
    expect(chest.type).toBe('chest');
    expect(buildingAt(state, 1, 3)?.type).toBe('inserter');
    ticks(state, 600);
    expect(cell(lab, 'sciencePackGreen')).toBe(0);
    expect(cell(lab, 'sciencePackRed') + (lab.unit === undefined ? 0 : 1)).toBe(5);
    expect(chest.slots.find((s) => s.item === 'sciencePackGreen')?.count).toBe(5);
  });

  it('ячейка вмещает одну стопку', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 250);
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(200);
  });
});

describe('лаборатория: энергия', () => {
  it('без активной технологии и без пакетов не берёт энергию', () => {
    const { state, labs } = world();
    ticks(state, 5);
    expect(labs[0]!.draw).toBeUndefined();
    set(state, 'logistics');
    ticks(state, 5);
    expect(labs[0]!.draw).toBeUndefined();
    put(state, labs[0]!, 'sciencePackRed', 2);
    ticks(state, 2);
    expect(labs[0]!.draw).toBe(true);
  });
});

describe('лаборатория: смена технологии и снос', () => {
  it('смена технологии посреди единицы возвращает её пакеты в ячейки', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 5);
    ticks(state, 100);
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(4);
    set(state, 'scienceGreen');
    expect(cell(labs[0]!, 'sciencePackRed')).toBe(5);
    expect(labs[0]!.unit).toBeUndefined();
    expect(labs[0]!.progress).toBe(0);
    expect(state.research.progress.logistics!.ticks).toBe(0);
  });

  it('завершение технологии возвращает пакеты незаконченных единиц других лабораторий', () => {
    const { state, labs } = world(2);
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 10);
    put(state, labs[1]!, 'sciencePackRed', 10);
    // Одну единицу до конца технологии: обе лаборатории в середине последних единиц.
    state.research.progress.logistics = { units: LOGISTICS.units - 1, ticks: 0 };
    ticks(state, 301);
    expect(state.research.done).toContain('logistics');
    ticks(state, 2);
    expect(labs.every((l) => l.unit === undefined)).toBe(true);
    expect(cell(labs[0]!, 'sciencePackRed') + cell(labs[1]!, 'sciencePackRed')).toBe(20);
  });

  it('снос возвращает ячейки и пакеты идущей единицы в инвентарь', () => {
    const { state, labs } = world();
    set(state, 'logistics');
    put(state, labs[0]!, 'sciencePackRed', 5);
    ticks(state, 100);
    const before = state.inventory.find((s) => s.item === 'sciencePackRed')?.count ?? 0;
    applyCommand(state, { type: 'demolish', x: 0, y: 0 } as Command);
    expect(buildingAt(state, 0, 0)).toBeNull();
    expect(state.inventory.find((s) => s.item === 'sciencePackRed')?.count).toBe(before + 5);
  });

  it('прямое addResearchProgress (без лабораторий) по-прежнему работает', () => {
    const state = createState(1, { width: 8, height: 8 });
    set(state, 'logistics');
    addResearchProgress(state, TOTAL);
    expect(state.research.done).toEqual(['logistics']);
  });
});
