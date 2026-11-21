import { technologies } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { createState } from './index';
import { addResearchProgress, setResearch } from './research';

const LOGISTICS = technologies.logistics;

describe('research: повторный выбор той же технологии', () => {
  it('выбор уже активной технологии не сбрасывает начатую единицу', () => {
    const state = createState(1);
    setResearch(state, 'logistics');
    addResearchProgress(state, 100);
    setResearch(state, 'logistics');
    expect(state.research.active).toBe('logistics');
    expect(state.research.progress.logistics).toEqual({ units: 0, ticks: 100 });
  });

  it('смена на другую технологию сбрасывает начатую единицу прежней, но не изученные единицы', () => {
    const state = createState(1);
    setResearch(state, 'logistics');
    addResearchProgress(state, LOGISTICS.unitTicks + 40);
    setResearch(state, 'scienceGreen');
    expect(state.research.progress.logistics).toEqual({ units: 1, ticks: 0 });
    expect(state.research.progress.scienceGreen).toEqual({ units: 0, ticks: 0 });
  });
});

describe('research: addResearchProgress, граничные тики', () => {
  it('ноль и отрицательные тики ничего не меняют, даже не создают запись прогресса', () => {
    const state = createState(1);
    state.research.active = 'logistics';
    addResearchProgress(state, 0);
    addResearchProgress(state, -5);
    expect(state.research.progress).toEqual({});
    expect(state.research.active).toBe('logistics');
  });

  it('избыток тиков не заводит единиц сверх units, технология изучается один раз', () => {
    const state = createState(1);
    setResearch(state, 'logistics');
    addResearchProgress(state, (LOGISTICS.units + 3) * LOGISTICS.unitTicks + 7);
    expect(state.research.progress.logistics).toEqual({ units: LOGISTICS.units, ticks: 0 });
    expect(state.research.done).toEqual(['logistics']);
    expect(state.events).toEqual([{ type: 'researchDone', tech: 'logistics' }]);
    expect(state.research.active).toBeNull();
  });
});
