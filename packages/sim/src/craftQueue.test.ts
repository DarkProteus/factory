import { INVENTORY_SLOTS, items, recipes } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { stepCraftQueue } from './craftQueue';
import { applyCommand, createState, hash, tick, type SimState } from './index';

function world(inventory: SimState['inventory'] = []): SimState {
  const state = createState(1, { width: 16, height: 16 });
  state.inventory = inventory;
  return state;
}

const craft = (state: SimState, recipe: string, count: number) => applyCommand(state, { type: 'craft', recipe, count });
const cancel = (state: SimState, index: number) => applyCommand(state, { type: 'cancelCraft', index });
const run = (state: SimState, n: number) => {
  for (let i = 0; i < n; i++) tick(state, []);
};
const have = (state: SimState, item: string) => state.inventory.filter((s) => s.item === item).reduce((a, s) => a + s.count, 0);

/** Забивает инвентарь полными стеками камня. */
const fillUp = (state: SimState) => {
  for (let i = 0; i < INVENTORY_SLOTS; i++) state.inventory.push({ item: 'stone', count: items.stone.stack });
};

const GEAR = recipes.ironGear.ticks;

// rule: hand-craft-queue
describe('очередь ручного крафта: постановка', () => {
  it('списывает ингредиенты сразу и ставит рецепт в очередь', () => {
    const state = world([{ item: 'ironPlate', count: 7 }]);
    craft(state, 'ironGear', 2);
    expect(have(state, 'ironPlate')).toBe(3);
    expect(state.craftQueue).toEqual([
      { recipe: 'ironGear', progress: 0 },
      { recipe: 'ironGear', progress: 0 },
    ]);
  });

  it('без ингредиентов команда игнорируется целиком', () => {
    const state = world([{ item: 'ironPlate', count: 3 }]);
    craft(state, 'ironGear', 2);
    expect(state.craftQueue).toEqual([]);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 3 }]);
  });

  it('рецепт печи, неизвестный рецепт и неверное количество игнорируются', () => {
    const state = world([{ item: 'ironOre', count: 9 }, { item: 'ironPlate', count: 9 }]);
    const before = hash(state);
    craft(state, 'smeltIron', 1);
    craft(state, 'nope', 1);
    craft(state, 'ironGear', 0);
    craft(state, 'ironGear', -1);
    craft(state, 'ironGear', 1.5);
    craft(state, 'ironGear', NaN);
    expect(hash(state)).toBe(before);
  });

  it('ингредиенты собираются из нескольких ячеек, пустые ячейки исчезают', () => {
    const state = world([{ item: 'ironPlate', count: 1 }, { item: 'ironPlate', count: 1 }]);
    craft(state, 'ironGear', 1);
    expect(state.inventory).toEqual([]);
  });
});

describe('очередь ручного крафта: выполнение', () => {
  it('идёт по ticks рецепта, результат попадает в инвентарь', () => {
    const state = world([{ item: 'ironPlate', count: 2 }]);
    craft(state, 'ironGear', 1);
    run(state, GEAR - 1);
    expect(have(state, 'ironGear')).toBe(0);
    expect(state.craftQueue).toHaveLength(1);
    run(state, 1);
    expect(have(state, 'ironGear')).toBe(1);
    expect(state.craftQueue).toEqual([]);
  });

  it('выполняет записи по одной, по порядку', () => {
    const state = world([{ item: 'ironPlate', count: 4 }]);
    craft(state, 'ironGear', 2);
    run(state, GEAR);
    expect(have(state, 'ironGear')).toBe(1);
    expect(state.craftQueue).toEqual([{ recipe: 'ironGear', progress: 0 }]);
    run(state, GEAR);
    expect(have(state, 'ironGear')).toBe(2);
  });

  it('выход рецепта может быть больше одного предмета', () => {
    const state = world([{ item: 'ironPlate', count: 1 }, { item: 'ironGear', count: 1 }]);
    craft(state, 'belt', 1);
    run(state, recipes.belt.ticks);
    expect(have(state, 'belt')).toBe(2);
  });

  it('если результат не помещается, очередь ждёт, потом выдаёт', () => {
    const state = world([{ item: 'ironPlate', count: 2 }]);
    craft(state, 'ironGear', 1);
    // Плиты ушли в крафт, ячейка освободилась: забиваем весь инвентарь.
    fillUp(state);
    run(state, GEAR + 50);
    expect(state.craftQueue).toHaveLength(1);
    expect(have(state, 'ironGear')).toBe(0);
    state.inventory.pop();
    run(state, 1);
    expect(state.craftQueue).toEqual([]);
    expect(have(state, 'ironGear')).toBe(1);
  });

  it('пустая очередь ничего не меняет', () => {
    const state = world();
    run(state, 5);
    expect(state.craftQueue).toEqual([]);
    expect(state.inventory).toEqual([]);
  });
});

describe('очередь ручного крафта: отмена', () => {
  it('возвращает ингредиенты и убирает запись по индексу', () => {
    const state = world([{ item: 'ironPlate', count: 6 }]);
    craft(state, 'ironGear', 3);
    run(state, 10);
    cancel(state, 1);
    expect(state.craftQueue).toEqual([
      { recipe: 'ironGear', progress: 10 },
      { recipe: 'ironGear', progress: 0 },
    ]);
    expect(have(state, 'ironPlate')).toBe(2);
  });

  it('отмена идущей записи сбрасывает прогресс, следующая начинает с нуля', () => {
    const state = world([{ item: 'ironPlate', count: 4 }]);
    craft(state, 'ironGear', 2);
    run(state, 10);
    cancel(state, 0);
    expect(state.craftQueue).toEqual([{ recipe: 'ironGear', progress: 0 }]);
    expect(have(state, 'ironPlate')).toBe(2);
  });

  it('неверный индекс игнорируется', () => {
    const state = world([{ item: 'ironPlate', count: 2 }]);
    craft(state, 'ironGear', 1);
    const before = hash(state);
    cancel(state, 1);
    cancel(state, -1);
    cancel(state, 0.5);
    expect(hash(state)).toBe(before);
  });

  it('при нехватке места отмена запрещена', () => {
    const state = world([{ item: 'ironPlate', count: 2 }]);
    craft(state, 'ironGear', 1);
    fillUp(state);
    const before = hash(state);
    cancel(state, 0);
    expect(hash(state)).toBe(before);
    expect(state.craftQueue).toHaveLength(1);
  });
});

describe('очередь ручного крафта: состояние', () => {
  it('входит в хеш и сериализуется без потерь', () => {
    const state = world([{ item: 'ironPlate', count: 2 }]);
    const before = hash(state);
    craft(state, 'ironGear', 1);
    run(state, 3);
    expect(hash(state)).not.toBe(before);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('очередь ручного крафта: краевые случаи', () => {
  it('не хватает одного из ингредиентов (другого вдоволь): команда игнорируется', () => {
    const state = world([{ item: 'ironPlate', count: 5 }]);
    const before = hash(state);
    craft(state, 'circuit', 1);
    expect(hash(state)).toBe(before);
    expect(state.craftQueue).toEqual([]);
  });

  it('отмена возвращает ингредиенты в неполную ячейку того же предмета, а не в новую', () => {
    const state = world([{ item: 'ironPlate', count: 5 }]);
    craft(state, 'ironGear', 1);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 3 }]);
    cancel(state, 0);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 5 }]);
  });

  it('отмена записи с исчезнувшим рецептом ничего не меняет, без ошибки', () => {
    const state = world([{ item: 'ironPlate', count: 5 }]);
    state.craftQueue.push({ recipe: 'gone', progress: 0 });
    cancel(state, 0);
    expect(state.craftQueue).toEqual([{ recipe: 'gone', progress: 0 }]);
    expect(state.inventory).toEqual([{ item: 'ironPlate', count: 5 }]);
  });

  it('шаг очереди с исчезнувшим рецептом ничего не меняет, без ошибки', () => {
    const state = world();
    state.craftQueue.push({ recipe: 'gone', progress: 0 });
    stepCraftQueue(state);
    expect(state.craftQueue).toEqual([{ recipe: 'gone', progress: 0 }]);
  });
});
