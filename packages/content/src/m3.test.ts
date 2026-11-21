import { describe, expect, it } from 'vitest';
import { buildings, items, recipes, startRecipes, technologies } from './index';
import type { RecipeId } from './index';

// Числа из docs/design.md, «Веха M3: решения».
describe('M3: предметы', () => {
  it('пакеты и сталь', () => {
    expect(items.sciencePackRed.stack).toBe(200);
    expect(items.sciencePackGreen.stack).toBe(200);
    expect(items.steelPlate.stack).toBe(100);
  });

  it('предметы-здания новых зданий есть', () => {
    for (const id of ['lab', 'undergroundBelt', 'fastUndergroundBelt', 'fastBelt', 'fastInserter', 'filterSplitter'] as const) {
      expect(items).toHaveProperty(id);
    }
  });
});

describe('M3: рецепты', () => {
  // rule: packs
  it('научные пакеты', () => {
    expect(recipes.sciencePackRed).toMatchObject({ in: { copperPlate: 1, ironGear: 1 }, out: { sciencePackRed: 1 }, ticks: 300, madeIn: 'assembler' });
    expect(recipes.sciencePackGreen).toMatchObject({ in: { inserter: 1, belt: 1 }, out: { sciencePackGreen: 1 }, ticks: 360, madeIn: 'assembler' });
  });

  it('сталь плавится в печи: 5 ironPlate, 16 с', () => {
    expect(recipes.steelPlate).toMatchObject({ in: { ironPlate: 5 }, out: { steelPlate: 1 }, ticks: 960, madeIn: 'furnace' });
  });

  it('здания: лаборатория, подземные, фильтр, быстрые', () => {
    expect(recipes.lab.in).toEqual({ circuit: 10, ironGear: 10, belt: 4 });
    expect(recipes.undergroundBelt).toMatchObject({ in: { ironPlate: 10, belt: 5 }, out: { undergroundBelt: 2 } });
    expect(recipes.filterSplitter.in).toEqual({ splitter: 1, circuit: 5 });
    expect(recipes.fastBelt.in).toEqual({ belt: 1, steelPlate: 1, ironGear: 2 });
    expect(recipes.fastUndergroundBelt).toMatchObject({ in: { undergroundBelt: 2, steelPlate: 4 }, out: { fastUndergroundBelt: 2 } });
    expect(recipes.fastInserter.in).toEqual({ inserter: 1, circuit: 3 });
    for (const id of ['lab', 'undergroundBelt', 'filterSplitter', 'fastBelt', 'fastUndergroundBelt', 'fastInserter'] as const) {
      expect(recipes[id].madeIn).toBe('assembler');
    }
  });
});

describe('M3: здания', () => {
  it('лаборатория: 3×3, 60 кВт из сети', () => {
    expect(buildings.lab).toMatchObject({ size: [3, 3], behavior: 'lab', energy: { kind: 'electric', kw: 60 } });
  });

  it('подземные, быстрая лента и фильтрующий разделитель: 1×1, без энергии', () => {
    for (const id of ['undergroundBelt', 'fastUndergroundBelt', 'fastBelt', 'filterSplitter'] as const) {
      expect(buildings[id].size).toEqual([1, 1]);
      expect(buildings[id]).not.toHaveProperty('energy');
    }
    expect(buildings.undergroundBelt.behavior).toBe('underground');
    expect(buildings.fastUndergroundBelt.behavior).toBe('underground');
    expect(buildings.fastBelt.behavior).toBe('belt');
    expect(buildings.filterSplitter.behavior).toBe('filterSplitter');
  });

  it('скорость быстрых лент вдвое выше обычной, дальность подземных — 4 клетки', () => {
    expect(buildings.fastBelt.beltSpeed).toBe(2 * buildings.belt.beltSpeed);
    expect(buildings.undergroundBelt.beltSpeed).toBe(buildings.belt.beltSpeed);
    expect(buildings.fastUndergroundBelt.beltSpeed).toBe(2 * buildings.belt.beltSpeed);
    expect(buildings.undergroundBelt.undergroundReach).toBe(4);
    expect(buildings.fastUndergroundBelt.undergroundReach).toBe(4);
  });

  it('быстрый манипулятор: 1×1, взмах 15 тиков, 46 кВт', () => {
    expect(buildings.fastInserter).toMatchObject({
      size: [1, 1],
      behavior: 'inserter',
      swingTicks: 15,
      energy: { kind: 'electric', kw: 46 },
    });
  });
});

describe('M3: технологии', () => {
  const red = { sciencePackRed: 1 };
  const both = { sciencePackRed: 1, sciencePackGreen: 1 };

  // rule: tech-tree, technologies-data
  it('таблица дерева', () => {
    const t = technologies;
    expect(t.logistics).toMatchObject({ unit: red, units: 10, unitTicks: 600, requires: [], unlocks: ['splitter'] });
    expect(t.undergroundBelts).toMatchObject({ unit: red, units: 20, unitTicks: 600, requires: ['logistics'], unlocks: ['undergroundBelt'] });
    expect(t.scienceGreen).toMatchObject({ unit: red, units: 30, unitTicks: 600, requires: [], unlocks: ['sciencePackGreen'] });
    expect(t.fastInserter).toMatchObject({ unit: both, units: 30, unitTicks: 900, requires: ['scienceGreen'], unlocks: ['fastInserter'] });
    expect(t.steel).toMatchObject({ unit: both, units: 40, unitTicks: 900, requires: ['scienceGreen'], unlocks: ['steelPlate'] });
    expect(t.filterSplitter).toMatchObject({ unit: both, units: 50, unitTicks: 900, requires: ['logistics', 'scienceGreen'], unlocks: ['filterSplitter'] });
    expect(t.fastBelt).toMatchObject({ unit: both, units: 75, unitTicks: 900, requires: ['logistics', 'steel'], unlocks: ['fastBelt', 'fastUndergroundBelt'] });
    expect(Object.keys(t)).toHaveLength(7);
  });

  it('у каждой технологии есть русское имя', () => {
    for (const t of Object.values(technologies)) expect(t.name.length).toBeGreaterThan(0);
  });
});

describe('M3: стартовый набор рецептов', () => {
  // rule: research-start-unlocked
  it('всё из M2, кроме splitter, плюс lab и sciencePackRed', () => {
    const m2 = [
      'smeltIron', 'smeltCopper', 'smeltStone', 'ironGear', 'copperCable', 'circuit', 'ammo', 'drill', 'furnace',
      'inserter', 'belt', 'chest', 'assembler', 'pole', 'generator',
    ];
    expect([...startRecipes].sort()).toEqual([...m2, 'lab', 'sciencePackRed'].sort());
  });

  it('каждый рецепт либо открыт на старте, либо открывается ровно одной технологией', () => {
    for (const id of Object.keys(recipes) as RecipeId[]) {
      const byTech = Object.values(technologies).filter((t) => (t.unlocks as readonly string[]).includes(id)).length;
      expect(byTech + (startRecipes.includes(id) ? 1 : 0), id).toBe(1);
    }
  });
});
