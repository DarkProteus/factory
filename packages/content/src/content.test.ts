import { describe, expect, it } from 'vitest';
import { buildings, items, recipes } from './index';
import type { BuildingDef, ItemDef, RecipeDef } from './index';

interface ContentTables {
  items: Record<string, ItemDef>;
  recipes: Record<string, RecipeDef>;
  buildings: Record<string, BuildingDef>;
}

// Валидатор ссылок. Живёт только в тесте: в самом пакете content логики нет.
// Возвращает список человекочитаемых ошибок, пустой список значит «всё в порядке».
function validateContent(tables: ContentTables): string[] {
  const errors: string[] = [];
  for (const [id, recipe] of Object.entries(tables.recipes)) {
    for (const side of ['in', 'out'] as const) {
      for (const itemId of Object.keys(recipe[side])) {
        if (!(itemId in tables.items)) {
          errors.push(`рецепт ${id}: предмет ${itemId} (${side}) не существует`);
        }
      }
    }
    if (!(recipe.madeIn in tables.buildings)) {
      errors.push(`рецепт ${id}: здание ${recipe.madeIn} (madeIn) не существует`);
    }
  }
  for (const [id, building] of Object.entries(tables.buildings)) {
    if (building.ammo !== undefined && !(building.ammo in tables.items)) {
      errors.push(`здание ${id}: предмет ${building.ammo} (ammo) не существует`);
    }
  }
  return errors;
}

const real: ContentTables = { items, recipes, buildings };

describe('настоящий контент', () => {
  it('содержит три предмета и один рецепт', () => {
    expect(Object.keys(items)).toHaveLength(3);
    expect(Object.keys(recipes)).toHaveLength(1);
  });

  it('проходит валидатор ссылок', () => {
    expect(validateContent(real)).toEqual([]);
  });

  it('содержит печь и бур для следующих задач', () => {
    expect(buildings.furnace.behavior).toBe('crafter');
    expect(buildings.drill.behavior).toBe('miner');
  });
});

describe('валидатор ссылок', () => {
  it('ловит предмет во входе рецепта, которого нет', () => {
    const errors = validateContent({
      ...real,
      recipes: { bad: { in: { ghost: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: предмет ghost (in) не существует']);
  });

  it('ловит предмет в выходе рецепта, которого нет', () => {
    const errors = validateContent({
      ...real,
      recipes: { bad: { in: { ironOre: 1 }, out: { ghost: 1 }, ticks: 1, madeIn: 'furnace' } },
    });
    expect(errors).toEqual(['рецепт bad: предмет ghost (out) не существует']);
  });

  it('ловит madeIn на несуществующее здание', () => {
    const errors = validateContent({
      ...real,
      recipes: { bad: { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 1, madeIn: 'ghost' } },
    });
    expect(errors).toEqual(['рецепт bad: здание ghost (madeIn) не существует']);
  });

  it('ловит ammo здания на несуществующий предмет', () => {
    const errors = validateContent({
      ...real,
      buildings: {
        ...buildings,
        turret: { size: [2, 2], power: 10, behavior: 'turret', ammo: 'ghost', range: 8, hp: 400 },
      },
    });
    expect(errors).toEqual(['здание turret: предмет ghost (ammo) не существует']);
  });
});
