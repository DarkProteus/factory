import { INVENTORY_SLOTS, items, recipes } from '@factory/content';
import { createState, tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import {
  applyUiKey,
  cancelCommand,
  canCraft,
  craftCommand,
  inventoryCells,
  jobProgress,
  manualRecipes,
  recipeSeconds,
} from './craftUi';
import { itemName } from './ui/names';

describe('рецепты ручного крафта', () => {
  it('это все рецепты madeIn: assembler, плавки нет', () => {
    const ids = manualRecipes().map((r) => r.id);
    expect(ids).toContain('ironGear');
    expect(ids).toContain('generator');
    expect(ids).not.toContain('smeltIron');
    expect(ids).toHaveLength(Object.values(recipes).filter((r) => r.madeIn === 'assembler').length);
  });

  it('рецепт серый, пока не хватает ингредиентов', () => {
    const gear = recipes.ironGear;
    expect(canCraft([], gear)).toBe(false);
    expect(canCraft([{ item: 'ironPlate', count: 1 }], gear)).toBe(false);
    expect(canCraft([{ item: 'ironPlate', count: 2 }], gear)).toBe(true);
  });

  it('ингредиенты считаются по всем ячейкам инвентаря', () => {
    const inv = [
      { item: 'ironPlate', count: 1 },
      { item: 'ironPlate', count: 1 },
    ];
    expect(canCraft(inv, recipes.ironGear)).toBe(true);
  });

  it('время рецепта в секундах', () => {
    expect(recipeSeconds(recipes.ironGear)).toBe(0.5);
    expect(recipeSeconds(recipes.drill)).toBe(2);
  });
});

describe('команды окна', () => {
  it('клик — craft на 1, Shift+клик — на 5', () => {
    expect(craftCommand('ironGear', false)).toEqual({ type: 'craft', recipe: 'ironGear', count: 1 });
    expect(craftCommand('ironGear', true)).toEqual({ type: 'craft', recipe: 'ironGear', count: 5 });
  });

  it('клик по очереди — cancelCraft с индексом', () => {
    expect(cancelCommand(2)).toEqual({ type: 'cancelCraft', index: 2 });
  });

  it('команды работают в sim: очередь растёт, отмена возвращает ингредиенты', () => {
    const state: SimState = createState(1);
    state.inventory = [{ item: 'ironPlate', count: 10 }];
    tick(state, [craftCommand('ironGear', true)]);
    expect(state.craftQueue).toHaveLength(5);
    expect(state.inventory).toEqual([]);
    tick(state, [cancelCommand(4)]);
    expect(state.craftQueue).toHaveLength(4);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 2 }]);
  });
});

describe('инвентарь и очередь', () => {
  it('сетка инвентаря всегда INVENTORY_SLOTS ячеек, пустые — null', () => {
    const cells = inventoryCells([{ item: 'coal', count: 20 }]);
    expect(cells).toHaveLength(INVENTORY_SLOTS);
    expect(cells[0]).toEqual({ item: 'coal', count: 20 });
    expect(cells[1]).toBeNull();
  });

  it('прогресс записи очереди — доля времени рецепта', () => {
    expect(jobProgress({ recipe: 'ironGear', progress: 0 })).toBe(0);
    expect(jobProgress({ recipe: 'ironGear', progress: 15 })).toBe(0.5);
    expect(jobProgress({ recipe: 'unknown', progress: 15 })).toBe(0);
  });
});

describe('клавиши окна', () => {
  it('E переключает окно, Esc закрывает', () => {
    expect(applyUiKey(false, 'KeyE')).toBe(true);
    expect(applyUiKey(true, 'KeyE')).toBe(false);
    expect(applyUiKey(true, 'Escape')).toBe(false);
    expect(applyUiKey(false, 'Escape')).toBe(false);
    expect(applyUiKey(true, 'KeyR')).toBe(true);
  });
});

describe('названия предметов', () => {
  it('у каждого предмета есть русское название', () => {
    for (const id of Object.keys(items)) expect(itemName(id)).toMatch(/[а-яё]/i);
    expect(itemName('nope')).toBe('nope');
  });
});
