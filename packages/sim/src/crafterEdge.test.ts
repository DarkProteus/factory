import { buildings, items, type BuildingDef, type RecipeDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import type { PlacedBuilding } from './buildings';
import { crafterCanAccept, runCrafter } from './crafter';

/** Свои рецепты печи: два одно-ингредиентных и один двухингредиентный. */
const recipes: Readonly<Record<string, RecipeDef>> = {
  one: { in: { a: 1 }, out: { x: 1 }, ticks: 3, madeIn: 'furnace' },
  other: { in: { c: 1 }, out: { y: 1 }, ticks: 3, madeIn: 'furnace' },
  pair: { in: { a: 1, b: 1 }, out: { z: 1 }, ticks: 3, madeIn: 'furnace' },
};

const furnace: BuildingDef = buildings.furnace;
const assembler: BuildingDef = buildings.assembler;

const bare = (type: string, extra: Partial<PlacedBuilding> = {}): PlacedBuilding => ({
  id: 1,
  type,
  x: 0,
  y: 0,
  dir: 0,
  progress: 0,
  output: null,
  ...extra,
});

describe('crafter: выбор рецепта по входу', () => {
  it('рецепт, которого уже нет в таблице, не мешает выбрать другой, пока печь пуста', () => {
    const b = bare('furnace', { recipe: 'gone', input: [] });
    expect(crafterCanAccept(b, furnace, 'a', recipes)).toBe(true);
  });

  it('рецепт задан, а входа ещё нет (input не создан): печь свободна и берёт другую руду', () => {
    const b = bare('furnace', { recipe: 'one' });
    expect(crafterCanAccept(b, furnace, 'c', recipes)).toBe(true);
  });

  it('рецепт сброшен, но прогресс не нулевой: печь не считается занятой по рецепту', () => {
    const b = bare('furnace', { progress: 2 });
    expect(crafterCanAccept(b, furnace, 'a', recipes)).toBe(true);
  });

  it('есть непустой стек входа: рецепт менять нельзя, даже если соседний стек пуст', () => {
    const b = bare('furnace', {
      recipe: 'pair',
      input: [
        { item: 'a', count: 0 },
        { item: 'b', count: 2 },
      ],
    });
    expect(crafterCanAccept(b, furnace, 'c', recipes)).toBe(false);
    b.input![1]!.count = 0;
    expect(crafterCanAccept(b, furnace, 'c', recipes)).toBe(true);
  });

  it('цикл идёт (progress > 0) при пустом входе: другой рецепт не принимается', () => {
    const b = bare('furnace', { recipe: 'one', progress: 1, input: [{ item: 'a', count: 0 }] });
    expect(crafterCanAccept(b, furnace, 'c', recipes)).toBe(false);
  });
});

describe('crafter: сборщик и предел приёма', () => {
  it('у сборщика рецепт которого нет в таблице: ничего не принимается, без ошибки', () => {
    const b = bare('assembler', { recipe: 'gone', input: [] });
    expect(crafterCanAccept(b, assembler, 'a', recipes)).toBe(false);
  });

  it('предмет, которого нет в items, при пределе stack не принимается, без ошибки', () => {
    const b = bare('furnace');
    expect(crafterCanAccept(b, furnace, 'a', recipes, undefined, 'stack')).toBe(false);
  });

  it('предел stack — стопка предмета, buffer — inputBuffer порций', () => {
    const b = bare('furnace', { recipe: 'smeltIron', input: [{ item: 'ironOre', count: 2 }] });
    expect(crafterCanAccept(b, furnace, 'ironOre')).toBe(false);
    expect(crafterCanAccept(b, furnace, 'ironOre', undefined, undefined, 'stack')).toBe(true);
    b.input![0]!.count = items.ironOre.stack;
    expect(crafterCanAccept(b, furnace, 'ironOre', undefined, undefined, 'stack')).toBe(false);
  });
});

/** Печь на угле с полной ячейкой: энергии хватает на любой цикл. */
const fueled = (extra: Partial<PlacedBuilding>): PlacedBuilding =>
  bare('furnace', { fuel: { item: 'coal', count: items.coal.stack }, ...extra });

describe('crafter: старт цикла', () => {
  it('нет стека входа под ингредиент: цикл не стартует, без ошибки, пустая печь сбрасывает рецепт', () => {
    const b = fueled({ recipe: 'one', input: [] });
    runCrafter(b, furnace, undefined, recipes);
    expect(b.progress).toBe(0);
    expect(b.recipe).toBeUndefined();
    expect(b.input).toBeUndefined();
  });

  it('полный выход блокирует старт, руда остаётся', () => {
    const b = fueled({ recipe: 'one', input: [{ item: 'a', count: 5 }], output: { item: 'x', count: furnace.buffer! } });
    runCrafter(b, furnace, undefined, recipes);
    expect(b.progress).toBe(0);
    expect(b.input).toEqual([{ item: 'a', count: 5 }]);
    expect(b.output).toEqual({ item: 'x', count: furnace.buffer! });
  });

  it('в выходе другой предмет: цикл не стартует, даже если место есть', () => {
    const b = fueled({ recipe: 'one', input: [{ item: 'a', count: 5 }], output: { item: 'other', count: 1 } });
    runCrafter(b, furnace, undefined, recipes);
    expect(b.progress).toBe(0);
    expect(b.input).toEqual([{ item: 'a', count: 5 }]);
  });

  it('пустой выход вмещает результат ровно в размер буфера', () => {
    const b = fueled({ recipe: 'one', input: [{ item: 'a', count: 1 }] });
    runCrafter(b, { ...furnace, buffer: 1 }, undefined, recipes);
    expect(b.progress).toBe(1);
    expect(b.input).toEqual([{ item: 'a', count: 0 }]);
  });

  it('буфер меньше результата: цикл не стартует', () => {
    const b = fueled({ recipe: 'one', input: [{ item: 'a', count: 1 }] });
    runCrafter(b, { ...furnace, buffer: 0 }, undefined, recipes);
    expect(b.progress).toBe(0);
  });

  it('не хватает одного ингредиента, а другой лежит: рецепт и вход сохраняются', () => {
    const input = [
      { item: 'a', count: 1 },
      { item: 'b', count: 0 },
    ];
    const b = fueled({ recipe: 'pair', input });
    runCrafter(b, furnace, undefined, recipes);
    expect(b.recipe).toBe('pair');
    expect(b.input).toEqual([
      { item: 'a', count: 1 },
      { item: 'b', count: 0 },
    ]);
  });

  it('выход не пуст, вход пуст: рецепт не сбрасывается (выход ещё не забран)', () => {
    const b = fueled({ recipe: 'one', input: [{ item: 'a', count: 0 }], output: { item: 'x', count: 1 } });
    runCrafter(b, furnace, undefined, recipes);
    expect(b.recipe).toBe('one');
  });
});
