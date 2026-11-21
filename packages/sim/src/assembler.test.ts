import { buildings, INVENTORY_SLOTS, items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, hash, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { setRecipe as setRecipeIn } from './assembler';
import { electrify, give, stocked } from './testKit';
import { canAccept } from './transfer';

const build = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3 = 1): Command => ({ type: 'build', building, x, y, dir });

const run = (state: SimState, ticks: number): void => {
  electrify(state);
  for (let i = 0; i < ticks; i++) tick(state, []);
};

/** Состояние с одним сборщиком в (0, 0); возвращает и его. */
function withAssembler(): { state: SimState; asm: PlacedBuilding } {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, [build('assembler', 0, 0)]);
  return { state, asm: buildingAt(state, 0, 0)! };
}

const setRecipe = (state: SimState, asm: PlacedBuilding, recipe: string): void =>
  applyCommand(state, { type: 'setRecipe', building: asm.id, recipe });

// rule: assembler-recipe
describe('сборщик: команда setRecipe', () => {
  it('задаёт рецепт из madeIn: assembler и готовит вход', () => {
    const { state, asm } = withAssembler();
    setRecipe(state, asm, 'circuit');
    expect(asm.recipe).toBe('circuit');
    expect(asm.input).toEqual([
      { item: 'ironPlate', count: 0 },
      { item: 'copperCable', count: 0 },
    ]);
  });

  it('игнорирует чужой рецепт, неизвестный рецепт, не сборщик и неизвестное здание', () => {
    const { state, asm } = withAssembler();
    tick(state, [build('furnace', 8, 0), build('chest', 8, 4)]);
    const before = hash(state);
    setRecipe(state, asm, 'smeltIron');
    setRecipe(state, asm, 'nope');
    setRecipe(state, buildingAt(state, 8, 0)!, 'ironGear');
    setRecipe(state, buildingAt(state, 8, 4)!, 'ironGear');
    applyCommand(state, { type: 'setRecipe', building: 999, recipe: 'ironGear' });
    expect(hash(state)).toBe(before);
    expect(asm.recipe).toBeUndefined();
  });

  it('рецепт входит в хеш состояния', () => {
    const a = withAssembler();
    const b = withAssembler();
    setRecipe(a.state, a.asm, 'ironGear');
    expect(hash(a.state)).not.toBe(hash(b.state));
  });
});

describe('сборщик: приём предметов', () => {
  it('без рецепта ничего не принимает и стоит', () => {
    const { state, asm } = withAssembler();
    expect(canAccept(asm, 'ironPlate', buildings)).toBe(false);
    asm.input = [{ item: 'ironPlate', count: 2 }];
    run(state, 100);
    expect(asm.progress).toBe(0);
    expect(asm.output).toBeNull();
  });

  it('принимает только ингредиенты рецепта и не больше буфера входа', () => {
    const { state, asm } = withAssembler();
    setRecipe(state, asm, 'circuit');
    expect(canAccept(asm, 'copperPlate', buildings)).toBe(false);
    expect(canAccept(asm, 'ironGear', buildings)).toBe(false);
    // Буфер входа 2 цикла: 2 железных пластины и 6 проводов.
    asm.input = [
      { item: 'ironPlate', count: 1 },
      { item: 'copperCable', count: 5 },
    ];
    expect(canAccept(asm, 'ironPlate', buildings)).toBe(true);
    expect(canAccept(asm, 'copperCable', buildings)).toBe(true);
    asm.input[0]!.count = 2;
    asm.input[1]!.count = 6;
    expect(canAccept(asm, 'ironPlate', buildings)).toBe(false);
    expect(canAccept(asm, 'copperCable', buildings)).toBe(false);
  });

  it('с рецептом работает и не сбрасывает его, когда вход пуст', () => {
    const { state, asm } = withAssembler();
    setRecipe(state, asm, 'ironGear');
    asm.input![0]!.count = 2;
    run(state, 40);
    expect(asm.output).toEqual({ item: 'ironGear', count: 1 });
    expect(asm.recipe).toBe('ironGear');
    expect(asm.input).toEqual([{ item: 'ironPlate', count: 0 }]);
  });
});

// rule: assembler-recipe
describe('сборщик: смена рецепта', () => {
  it('отдаёт в инвентарь вход, выход и ингредиенты идущего цикла', () => {
    const { state, asm } = withAssembler();
    state.inventory = [];
    setRecipe(state, asm, 'circuit');
    asm.input = [
      { item: 'ironPlate', count: 2 },
      { item: 'copperCable', count: 6 },
    ];
    run(state, 10); // цикл начат: 1 пластина и 3 провода списаны со входа
    expect(asm.progress).toBeGreaterThan(0);
    asm.output = { item: 'circuit', count: 4 };
    setRecipe(state, asm, 'ammo');
    const inv = (item: string): number => state.inventory.find((s) => s.item === item)?.count ?? 0;
    expect(inv('ironPlate')).toBe(2);
    expect(inv('copperCable')).toBe(6);
    expect(inv('circuit')).toBe(4);
    expect(asm).toMatchObject({ recipe: 'ammo', progress: 0, output: null, input: [{ item: 'ironPlate', count: 0 }] });
  });

  it('запрещена, если содержимое не помещается в инвентарь', () => {
    const { state, asm } = withAssembler();
    setRecipe(state, asm, 'ironGear');
    asm.input![0]!.count = 3;
    asm.output = { item: 'ironGear', count: 5 };
    state.inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'stone', count: items.stone.stack }));
    const before = hash(state);
    setRecipe(state, asm, 'ammo');
    expect(hash(state)).toBe(before);
    expect(asm.recipe).toBe('ironGear');
  });

  it('выбор того же рецепта ничего не меняет', () => {
    const { state, asm } = withAssembler();
    setRecipe(state, asm, 'ironGear');
    asm.input![0]!.count = 2;
    const before = hash(state);
    setRecipe(state, asm, 'ironGear');
    expect(hash(state)).toBe(before);
  });
});

describe('сборщик: цепочка провод -> схема', () => {
  /** Сундук меди -> манипулятор -> сборщик проводов -> манипулятор -> сборщик схем -> манипулятор -> сундук; железо в схемы с юга. */
  function plant(): SimState {
    const state = stocked(createState(1, { width: 24, height: 12 }), ['assembler']);
    give(state, 'assembler', 2);
    tick(state, [
      build('chest', 0, 1),
      build('inserter', 1, 1),
      build('assembler', 2, 0),
      build('inserter', 5, 1),
      build('assembler', 6, 0),
      build('inserter', 9, 1),
      build('chest', 10, 1),
      build('chest', 7, 4),
      build('inserter', 7, 3, 0),
    ]);
    applyCommand(state, { type: 'setRecipe', building: buildingAt(state, 2, 0)!.id, recipe: 'copperCable' });
    applyCommand(state, { type: 'setRecipe', building: buildingAt(state, 6, 0)!.id, recipe: 'circuit' });
    buildingAt(state, 0, 1)!.slots = [{ item: 'copperPlate', count: 100 }];
    buildingAt(state, 7, 4)!.slots = [{ item: 'ironPlate', count: 100 }];
    return state;
  }

  it('даёт расчётное число схем', () => {
    const state = plant();
    const TICKS = 3000;
    run(state, TICKS);
    const out = buildingAt(state, 10, 1)!.slots?.find((s) => s.item === 'circuit')?.count ?? 0;
    // Узкое место — манипулятор между сборщиками: 1 провод за 31 тик (30 тиков взмаха + взятие),
    // схеме нужно 3 провода, то есть одна схема примерно за 93 тика; запуск занимает порядка 100 тиков.
    const expected = (TICKS - 100) / 93;
    expect(out).toBeGreaterThanOrEqual(Math.floor(expected) - 1);
    expect(out).toBeLessThanOrEqual(Math.ceil(expected) + 1);
  });
});

describe('сборщик: setRecipe с чужими таблицами зданий', () => {
  it('тип здания, которого нет в таблице, игнорируется без ошибки', () => {
    const { state, asm } = withAssembler();
    setRecipeIn(state, asm.id, 'circuit', {});
    expect(asm.recipe).toBeUndefined();
  });

  it('здание с recipeMode chosen, но другим поведением, рецепт не получает', () => {
    const { state, asm } = withAssembler();
    const defs = { ...buildings, assembler: { ...buildings.assembler, behavior: 'lab' as const } };
    setRecipeIn(state, asm.id, 'circuit', defs);
    expect(asm.recipe).toBeUndefined();
    expect(asm.input).toBeUndefined();
  });

  it('печь (crafter с recipeMode byInput) рецепт командой не получает, даже свой', () => {
    const { state } = withAssembler();
    tick(state, [build('furnace', 8, 0)]);
    const furnace = buildingAt(state, 8, 0)!;
    setRecipeIn(state, furnace.id, 'smeltIron');
    expect(furnace.recipe).toBeUndefined();
    expect(furnace.input).toBeUndefined();
  });
});
