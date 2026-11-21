import { describe, expect, it } from 'vitest';
import { buildings, items, recipes, technologies } from './index';
import type { BuildingDef, BuildingId, ItemId, RecipeDef } from './index';
import { validateContent, type ContentTables } from './validateContent.testkit';

const real: ContentTables = { items, recipes, buildings, technologies };

// rule: craft-recipes
describe('настоящий контент', () => {
  it('содержит предметы и рецепты из таблиц design.md', () => {
    for (const id of ['ironOre', 'copperOre', 'coal', 'stone', 'ironPlate', 'copperPlate', 'stoneBrick', 'ironGear', 'copperCable', 'circuit', 'ammo']) {
      expect(items).toHaveProperty(id);
    }
    // 16 рецептов M2 и 9 рецептов M3 (см. m3.test.ts).
    expect(Object.keys(recipes)).toHaveLength(16 + 9);
  });

  it('рецепт патронов: 4 ironPlate', () => {
    expect(recipes.ammo.in).toEqual({ ironPlate: 4 });
    expect(recipes.ammo.out).toEqual({ ammo: 1 });
  });

  it('рецепты зданий и крафта совпадают с design.md', () => {
    expect(recipes.ironGear).toMatchObject({ in: { ironPlate: 2 }, out: { ironGear: 1 }, madeIn: 'assembler' });
    expect(recipes.copperCable).toMatchObject({ in: { copperPlate: 1 }, out: { copperCable: 2 } });
    expect(recipes.circuit).toMatchObject({ in: { ironPlate: 1, copperCable: 3 }, out: { circuit: 1 } });
    expect(recipes.drill.in).toEqual({ ironPlate: 10, ironGear: 5, circuit: 3 });
    expect(recipes.furnace.in).toEqual({ stone: 5 });
    expect(recipes.inserter.in).toEqual({ ironPlate: 1, ironGear: 1, circuit: 1 });
    expect(recipes.belt).toMatchObject({ in: { ironPlate: 1, ironGear: 1 }, out: { belt: 2 } });
    expect(recipes.splitter.in).toEqual({ ironPlate: 5, circuit: 2, belt: 2 });
    expect(recipes.chest.in).toEqual({ ironPlate: 8 });
    expect(recipes.assembler.in).toEqual({ ironPlate: 9, ironGear: 5, circuit: 3 });
    expect(recipes.pole).toMatchObject({ in: { ironPlate: 1, copperCable: 2 }, out: { pole: 2 } });
    expect(recipes.generator.in).toEqual({ ironPlate: 10, ironGear: 5, stoneBrick: 10 });
    expect(recipes.smeltCopper).toMatchObject({ in: { copperOre: 1 }, out: { copperPlate: 1 }, madeIn: 'furnace' });
    expect(recipes.smeltStone).toMatchObject({ in: { stone: 1 }, out: { stoneBrick: 1 }, madeIn: 'furnace' });
  });

  it('здания: размеры, энергия и поведения из design.md', () => {
    expect(buildings.drill).toMatchObject({ size: [2, 2], energy: { kind: 'electric', kw: 90 } });
    expect(buildings.furnace).toMatchObject({ size: [2, 2], energy: { kind: 'fuel', kw: 90 }, fuelSlot: true, recipeMode: 'byInput' });
    expect(buildings.inserter.energy).toEqual({ kind: 'electric', kw: 13 });
    expect(buildings.assembler).toMatchObject({ size: [3, 3], behavior: 'crafter', recipeMode: 'chosen', energy: { kind: 'electric', kw: 75 } });
    expect(buildings.generator).toMatchObject({ size: [3, 3], behavior: 'generator', fuelSlot: true, energy: { kind: 'generator', kw: 900 } });
    expect(buildings.pole).toMatchObject({ behavior: 'pole', coverage: 5, wireReach: 7 });
    expect(buildings.splitter.behavior).toBe('splitter');
    for (const id of ['belt', 'splitter', 'chest', 'pole'] as const) expect(buildings[id]).not.toHaveProperty('energy');
  });

  it('предмет-здание: тот же id, stack 50 (belt, fastBelt и pole — 100); уголь даёт 4000 кДж', () => {
    for (const id of Object.keys(buildings) as BuildingId[]) {
      expect(items[id].stack).toBe(id === 'belt' || id === 'fastBelt' || id === 'pole' ? 100 : 50);
    }
    expect(items.coal.fuel).toBe(4000);
  });

  it('проходит валидатор ссылок', () => {
    expect(validateContent(real)).toEqual([]);
  });

  it('содержит печь и бур для следующих задач', () => {
    expect(buildings.furnace.behavior).toBe('crafter');
    expect(buildings.drill.behavior).toBe('miner');
  });
});

describe('манипулятор, печь и сундук', () => {
  it('описаны с поведениями inserter, crafter и container', () => {
    expect(buildings.inserter.behavior).toBe('inserter');
    expect(buildings.furnace.behavior).toBe('crafter');
    expect(buildings.chest.behavior).toBe('container');
  });

  it('имеют параметры своих поведений', () => {
    expect(buildings.inserter.swingTicks).toBeGreaterThan(0);
    expect(buildings.furnace.inputBuffer).toBeGreaterThan(0);
    expect(buildings.furnace.buffer).toBeGreaterThan(0);
    expect(buildings.chest.slots).toBeGreaterThan(0);
  });

  it('рецепт печи: руда в пластину за ticks тиков', () => {
    expect(recipes.smeltIron).toMatchObject({ in: { ironOre: 1 }, out: { ironPlate: 1 }, madeIn: 'furnace' });
    expect(recipes.smeltIron.ticks).toBeGreaterThan(0);
  });
});

describe('валидатор ссылок', () => {
  it('ловит рецепт крафтера с несколькими выходными предметами', () => {
    const errors = validateContent({
      ...real,
      recipes: { ...recipes, bad: { in: { ironOre: 1 }, out: { ironPlate: 1, ammo: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: крафтер furnace держит один выходной предмет']);
  });

  it('ловит предмет во входе рецепта, которого нет', () => {
    const errors = validateContent({
      ...real,
      recipes: { ...recipes, bad: { in: { ghost: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: предмет ghost (in) не существует']);
  });

  it('ловит предмет в выходе рецепта, которого нет', () => {
    const errors = validateContent({
      ...real,
      recipes: { ...recipes, bad: { in: { ironOre: 1 }, out: { ghost: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: предмет ghost (out) не существует']);
  });

  it('ловит madeIn на несуществующее здание', () => {
    const errors = validateContent({
      ...real,
      recipes: { ...recipes, bad: { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'ghost' } },
    });
    expect(errors).toEqual(['рецепт bad: здание ghost (madeIn) не существует']);
  });

  it('ловит ammo здания на несуществующий предмет', () => {
    const errors = validateContent({
      ...real,
      buildings: {
        ...buildings,
        turret: { size: [2, 2], energy: { kind: 'electric', kw: 10 }, behavior: 'turret', ammo: 'ghost', range: 8, hp: 400 },
      },
    });
    expect(errors).toContain('здание turret: предмет ghost (ammo) не существует');
  });
});

describe('валидатор ссылок: здания и топливо', () => {
  const turret: BuildingDef = { size: [1, 1], behavior: 'turret', hp: 1 };

  it('ловит здание без предмета-здания', () => {
    const errors = validateContent({ ...real, buildings: { ...buildings, turret } });
    expect(errors).toEqual(['здание turret: нет предмета-здания turret']);
  });

  it('ловит предмет-здание без рецепта madeIn assembler', () => {
    const errors = validateContent({
      ...real,
      items: { ...items, turret: { name: 'Турель', stack: 50 } },
      buildings: { ...buildings, turret },
    });
    expect(errors).toEqual(['предмет-здание turret: нет рецепта madeIn assembler']);
  });

  it('ловит fuel-здание без fuelSlot', () => {
    const errors = validateContent({
      ...real,
      buildings: { ...buildings, furnace: { ...buildings.furnace, fuelSlot: false } },
    });
    expect(errors).toEqual(['здание furnace: питается топливом, но без fuelSlot']);
  });

  it('ловит рецепт печи с несколькими входами', () => {
    const errors = validateContent({
      ...real,
      recipes: { ...recipes, bad: { in: { ironOre: 1, stone: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: печь furnace выбирает рецепт по входу, вход должен быть один']);
  });
});

// Типовые проверки. vitest типы не проверяет, их ловит tsc (pnpm typecheck и
// pnpm build): лишний @ts-expect-error там тоже станет ошибкой.
describe('валидатор ссылок: технологии', () => {
  const tech = { name: 'Тест', unit: { sciencePackRed: 1 }, units: 1, unitTicks: 1, requires: [], unlocks: [] };
  const withTech = (extra: Record<string, unknown>): string[] =>
    validateContent({ ...real, technologies: { ...technologies, ...extra } as ContentTables['technologies'] });

  it('ловит предмет в unit, которого нет', () => {
    expect(withTech({ bad: { ...tech, unit: { ghost: 1 } } })).toEqual(['технология bad: предмет ghost (unit) не существует']);
  });

  it('ловит requires на несуществующую технологию', () => {
    expect(withTech({ bad: { ...tech, requires: ['ghost'] } })).toEqual(['технология bad: требование ghost (requires) не существует']);
  });

  it('ловит unlocks на несуществующий рецепт', () => {
    expect(withTech({ bad: { ...tech, unlocks: ['ghost'] } })).toEqual(['технология bad: рецепт ghost (unlocks) не существует']);
  });

  it('ловит цикл в requires', () => {
    const errors = withTech({ a: { ...tech, requires: ['b'] }, b: { ...tech, requires: ['a'] } });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/цикл в requires/);
  });

  it('ловит технологию, требующую саму себя', () => {
    expect(withTech({ a: { ...tech, requires: ['a'] } })).toEqual(['технологии: цикл в requires: a -> a']);
  });
});

describe('строгие типы ключей', () => {
  type Recipe = RecipeDef<ItemId, BuildingId>;

  it('компилятор ловит опечатки в id', () => {
    // @ts-expect-error нет предмета ghost во входе
    const badIn = { in: { ghost: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'furnace' } satisfies Recipe;
    // @ts-expect-error нет предмета ghost в выходе
    const badOut = { in: { ironOre: 1 }, out: { ghost: 1 }, ticks: 1, madeIn: 'furnace' } satisfies Recipe;
    // @ts-expect-error нет здания ghost
    const badMadeIn = { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'ghost' } satisfies Recipe;
    // @ts-expect-error нет предмета ghost в ammo
    const badAmmo = { size: [1, 1], behavior: 'turret', hp: 1, ammo: 'ghost' } satisfies BuildingDef<ItemId>;
    const good = { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'furnace' } satisfies Recipe;
    expect([badIn, badOut, badMadeIn, badAmmo, good]).toHaveLength(5);
  });
});
