import { buildings, startRecipes, technologies } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, hash, tick, type Command, type SimState } from './index';
import { addResearchProgress, canResearch, isUnlocked } from './research';
import { give, stocked } from './testKit';
import { canAccept } from './transfer';

const world = (): SimState => stocked(createState(1, { width: 16, height: 16 }));
const set = (state: SimState, tech: string): void => applyCommand(state, { type: 'setResearch', tech } as Command);

/** Изучает технологию целиком: прямой вызов прогресса, как это сделает лаборатория. */
function finish(state: SimState, tech: keyof typeof technologies): void {
  set(state, tech);
  const t = technologies[tech];
  addResearchProgress(state, t.units * t.unitTicks);
}

describe('исследования: начальное состояние', () => {
  it('новая партия: ничего не изучено, открыты startRecipes (отсортированный массив)', () => {
    for (const state of [createState(1), world()]) {
      expect(state.research.active).toBeNull();
      expect(state.research.done).toEqual([]);
      expect(state.research.progress).toEqual({});
      expect(state.research.unlocked).toEqual([...startRecipes].sort());
      expect(state.events).toEqual([]);
    }
  });

  it('isUnlocked и canResearch отражают состояние', () => {
    const state = world();
    expect(isUnlocked(state, 'lab')).toBe(true);
    expect(isUnlocked(state, 'splitter')).toBe(false);
    expect(canResearch(state, 'logistics')).toBe(true);
    expect(canResearch(state, 'undergroundBelts')).toBe(false);
    expect(canResearch(state, 'nope' as never)).toBe(false);
  });
});

describe('команда setResearch', () => {
  it('выбирает доступную технологию', () => {
    const state = world();
    set(state, 'logistics');
    expect(state.research.active).toBe('logistics');
  });

  it('игнорирует технологию с неизученными requires и неизвестную', () => {
    const state = world();
    const before = hash(state);
    set(state, 'undergroundBelts');
    set(state, 'filterSplitter');
    set(state, 'nope');
    expect(hash(state)).toBe(before);
  });

  it('игнорирует уже изученную', () => {
    const state = world();
    finish(state, 'logistics');
    const before = hash(state);
    set(state, 'logistics');
    expect(hash(state)).toBe(before);
    expect(state.research.active).toBeNull();
  });

  it('переключение сохраняет прогресс (единицы) прочих технологий', () => {
    const state = world();
    set(state, 'logistics');
    addResearchProgress(state, 3 * technologies.logistics.unitTicks + 100);
    set(state, 'scienceGreen');
    expect(state.research.active).toBe('scienceGreen');
    addResearchProgress(state, 2 * technologies.scienceGreen.unitTicks);
    set(state, 'logistics');
    expect(state.research.progress.logistics?.units).toBe(3);
    expect(state.research.progress.scienceGreen?.units).toBe(2);
  });

  it('при смене начатая единица прежней технологии сбрасывается', () => {
    const state = world();
    set(state, 'logistics');
    addResearchProgress(state, 100);
    set(state, 'scienceGreen');
    expect(state.research.progress.logistics).toEqual({ units: 0, ticks: 0 });
  });

  it('работает как команда в тике', () => {
    const state = world();
    tick(state, [{ type: 'setResearch', tech: 'logistics' } as Command]);
    expect(state.research.active).toBe('logistics');
  });
});

describe('прогресс и завершение технологии', () => {
  it('без активной технологии прогресс не растёт', () => {
    const state = world();
    const before = hash(state);
    addResearchProgress(state, 10_000);
    expect(hash(state)).toBe(before);
  });

  it('тики копятся в единицы; остаток переносится', () => {
    const state = world();
    set(state, 'logistics');
    const u = technologies.logistics.unitTicks;
    addResearchProgress(state, u - 1);
    expect(state.research.progress.logistics).toEqual({ units: 0, ticks: u - 1 });
    addResearchProgress(state, 2);
    expect(state.research.progress.logistics).toEqual({ units: 1, ticks: 1 });
  });

  it('завершение: unlocks открываются (массив отсортирован), done, active сброшен, событие', () => {
    const state = world();
    set(state, 'logistics');
    addResearchProgress(state, technologies.logistics.units * technologies.logistics.unitTicks);
    expect(isUnlocked(state, 'splitter')).toBe(true);
    expect(state.research.unlocked).toEqual([...state.research.unlocked].sort());
    expect(state.research.done).toEqual(['logistics']);
    expect(state.research.active).toBeNull();
    expect(state.events).toEqual([{ type: 'researchDone', tech: 'logistics' }]);
    // Зависимая технология стала доступной.
    expect(canResearch(state, 'undergroundBelts')).toBe(true);
  });

  it('события очищаются в начале следующего тика', () => {
    const state = world();
    finish(state, 'logistics');
    expect(state.events).toHaveLength(1);
    tick(state, []);
    expect(state.events).toEqual([]);
  });

  it('состояние исследований входит в хеш', () => {
    const a = world();
    const b = world();
    expect(hash(a)).toBe(hash(b));
    set(a, 'logistics');
    expect(hash(a)).not.toBe(hash(b));
    set(b, 'logistics');
    expect(hash(a)).toBe(hash(b));
    addResearchProgress(a, 5);
    expect(hash(a)).not.toBe(hash(b));
    const c = world();
    const d = world();
    finish(c, 'logistics');
    expect(hash(c)).not.toBe(hash(d));
  });
});

describe('закрытые рецепты', () => {
  it('ручной крафт закрытого рецепта отклоняется, открытого — принимается', () => {
    const state = world();
    give(state, 'ironPlate', 20);
    give(state, 'circuit', 20);
    give(state, 'belt', 20);
    applyCommand(state, { type: 'craft', recipe: 'splitter', count: 1 });
    expect(state.craftQueue).toEqual([]);
    applyCommand(state, { type: 'craft', recipe: 'ironGear', count: 1 });
    expect(state.craftQueue).toHaveLength(1);
  });

  it('после изучения закрытый рецепт можно ставить в очередь', () => {
    const state = world();
    give(state, 'ironPlate', 20);
    give(state, 'circuit', 20);
    give(state, 'belt', 20);
    finish(state, 'logistics');
    applyCommand(state, { type: 'craft', recipe: 'splitter', count: 1 });
    expect(state.craftQueue).toHaveLength(1);
  });

  it('сборщик не выбирает закрытый рецепт', () => {
    const state = world();
    tick(state, [{ type: 'build', building: 'assembler', x: 0, y: 0, dir: 1 }]);
    const asm = buildingAt(state, 0, 0)!;
    applyCommand(state, { type: 'setRecipe', building: asm.id, recipe: 'splitter' });
    expect(asm.recipe).toBeUndefined();
    finish(state, 'logistics');
    applyCommand(state, { type: 'setRecipe', building: asm.id, recipe: 'splitter' });
    expect(asm.recipe).toBe('splitter');
  });

  it('предмет закрытого здания из инвентаря ставится', () => {
    const state = world();
    expect(isUnlocked(state, 'splitter')).toBe(false);
    tick(state, [{ type: 'build', building: 'splitter', x: 0, y: 0, dir: 1 }]);
    expect(buildingAt(state, 0, 0)?.type).toBe('splitter');
  });
});

describe('печь выбирает рецепт только среди открытых', () => {
  const furnaceWorld = () => {
    const state = world();
    tick(state, [{ type: 'build', building: 'furnace', x: 0, y: 0, dir: 1 }]);
    return { state, furnace: buildingAt(state, 0, 0)! };
  };

  it('до изучения steel железная пластина в печь не принимается', () => {
    const { state, furnace } = furnaceWorld();
    expect(canAccept(furnace, 'ironPlate', buildings, state.research.unlocked)).toBe(false);
    expect(canAccept(furnace, 'ironOre', buildings, state.research.unlocked)).toBe(true);
  });

  it('ручная перекладка не кладёт пластину в печь до steel', () => {
    const { state, furnace } = furnaceWorld();
    give(state, 'ironPlate', 10);
    applyCommand(state, { type: 'putIntoBuilding', building: furnace.id, item: 'ironPlate', count: 10 });
    expect(furnace.input ?? []).toEqual([]);
    expect(state.inventory.find((s) => s.item === 'ironPlate')?.count).toBe(10);
  });

  it('после steel пластина принимается', () => {
    const { state, furnace } = furnaceWorld();
    finish(state, 'scienceGreen');
    finish(state, 'steel');
    expect(canAccept(furnace, 'ironPlate', buildings, state.research.unlocked)).toBe(true);
    give(state, 'ironPlate', 10);
    applyCommand(state, { type: 'putIntoBuilding', building: furnace.id, item: 'ironPlate', count: 10 });
    expect(furnace.recipe).toBe('steelPlate');
  });
});
