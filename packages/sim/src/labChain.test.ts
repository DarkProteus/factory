import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, tick, type Command, type Dir, type PlacedBuilding, type SimState } from './index';
import { LAB_BUFFER_UNITS } from './lab';
import { electrify, stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });
const cell = (lab: PlacedBuilding, item: string): number => lab.input?.find((s) => s.item === item)?.count ?? 0;
const ticks = (state: SimState, n: number): void => {
  for (let i = 0; i < n; i++) tick(state, []);
};

/** Лаборатория (0,0) → манипулятор (3,1) → лаборатория (4,0); электрифицировано, активна «Логистика» (единица = 1 красный пакет). */
function chain(): { state: SimState; first: PlacedBuilding; second: PlacedBuilding } {
  const state = stocked(createState(1, { width: 24, height: 16 }));
  tick(state, [build('lab', 0, 0), build('lab', 4, 0), build('inserter', 3, 1, 1)]);
  electrify(state);
  applyCommand(state, { type: 'setResearch', tech: 'logistics' } as Command);
  return { state, first: buildingAt(state, 0, 0)!, second: buildingAt(state, 4, 0)! };
}

describe('цепочка лабораторий через манипулятор', () => {
  it('вторая лаборатория получает пакеты из первой, но не больше запаса', () => {
    const { state, first, second } = chain();
    first.input = [{ item: 'sciencePackRed', count: 10 }];
    ticks(state, 200);
    // Вторая взяла запас (LAB_BUFFER_UNITS единиц) и начала единицу; лимит не превышен.
    expect(second.unit).toBe('logistics');
    expect(cell(second, 'sciencePackRed')).toBeLessThanOrEqual(LAB_BUFFER_UNITS);
    expect(cell(second, 'sciencePackRed')).toBeGreaterThan(0);
    // Пакеты не потеряны: первая отдала их второй, остальное лежит в её ячейке или в идущей единице.
    const total = cell(first, 'sciencePackRed') + cell(second, 'sciencePackRed') + (first.unit ? 1 : 0) + (second.unit ? 1 : 0);
    expect(total).toBe(10);
  });

  it('пакеты идущей единицы манипулятор не забирает', () => {
    const { state, first, second } = chain();
    first.unit = 'logistics';
    first.progress = 1;
    first.input = [{ item: 'sciencePackRed', count: 0 }];
    ticks(state, 200);
    expect(first.unit).toBe('logistics');
    expect(cell(second, 'sciencePackRed')).toBe(0);
    expect(second.unit).toBeUndefined();
  });

  it('без активной технологии манипулятор из лаборатории ничего не берёт', () => {
    const { state, first, second } = chain();
    state.research.active = null;
    first.input = [{ item: 'sciencePackRed', count: 5 }];
    ticks(state, 200);
    expect(cell(first, 'sciencePackRed')).toBe(5);
    expect(cell(second, 'sciencePackRed')).toBe(0);
  });
});
