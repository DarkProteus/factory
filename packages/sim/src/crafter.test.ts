import { buildings, recipes } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { crafterCanAccept } from './crafter';
import { buildingAt, createState, tick, type Command, type PlacedBuilding, type SimState } from './index';

const recipe = recipes.smeltIron;
const T = recipe.ticks;
const OUT_CAP = buildings.furnace.buffer;

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function withFurnace(): { state: SimState; f: PlacedBuilding } {
  const state = createState(1, { width: 8, height: 8 });
  tick(state, [{ type: 'build', building: 'furnace', x: 2, y: 2, dir: 0 } as Command]);
  return { state, f: buildingAt(state, 2, 2)! };
}

function load(f: PlacedBuilding, count: number): void {
  f.recipe = 'smeltIron';
  f.input = [{ item: 'ironOre', count }];
}

describe('печь', () => {
  it('делает пластину из руды ровно за ticks тиков', () => {
    const { state, f } = withFurnace();
    load(f, 1);
    run(state, T - 1);
    expect(f.output).toBeNull();
    run(state, 1);
    expect(f.output).toEqual({ item: 'ironPlate', count: 1 });
    expect(f.input).toEqual([{ item: 'ironOre', count: 0 }]);
  });

  it('несколько циклов подряд, руда списывается на старте цикла', () => {
    const { state, f } = withFurnace();
    load(f, 3);
    run(state, T * 2);
    expect(f.output).toEqual({ item: 'ironPlate', count: 2 });
    expect(f.input).toEqual([{ item: 'ironOre', count: 1 }]);
  });

  it('без руды ничего не делает', () => {
    const { state, f } = withFurnace();
    run(state, T * 2);
    expect(f.output).toBeNull();
    expect(f.progress).toBe(0);
  });

  it('при полном выходе останавливается и продолжает после разгрузки', () => {
    const { state, f } = withFurnace();
    load(f, 3);
    f.output = { item: 'ironPlate', count: OUT_CAP };
    run(state, T * 3);
    expect(f.output).toEqual({ item: 'ironPlate', count: OUT_CAP });
    expect(f.input).toEqual([{ item: 'ironOre', count: 3 }]);
    expect(f.progress).toBe(0);
    f.output!.count -= 1;
    run(state, T);
    expect(f.output).toEqual({ item: 'ironPlate', count: OUT_CAP });
    expect(f.input).toEqual([{ item: 'ironOre', count: 2 }]);
    run(state, T);
    expect(f.output!.count).toBe(OUT_CAP);
  });

  it('сбрасывает рецепт, когда вход, выход и прогресс пусты', () => {
    const { state, f } = withFurnace();
    load(f, 1);
    run(state, T);
    f.output = null;
    run(state, 1);
    expect(f.recipe).toBeUndefined();
    expect(f.input).toBeUndefined();
  });
});

describe('здания M2 без реализованного поведения', () => {
  it('сборщик без выбранного рецепта стоит и ничего не принимает', () => {
    const state = createState(1, { width: 8, height: 8 });
    tick(state, [{ type: 'build', building: 'assembler', x: 2, y: 2, dir: 0 } as Command]);
    const a = buildingAt(state, 2, 2)!;
    expect(crafterCanAccept(a, buildings.assembler, 'ironPlate')).toBe(false);
    run(state, 100);
    expect(a.output).toBeNull();
  });

  it('разделитель, столб и генератор ставятся и стоят без падений', () => {
    const state = createState(1, { width: 12, height: 12 });
    for (const [building, x, y] of [['splitter', 0, 0], ['pole', 2, 0], ['generator', 4, 4]] as const) {
      tick(state, [{ type: 'build', building, x, y, dir: 0 } as Command]);
      expect(buildingAt(state, x, y)).toBeTruthy();
    }
    run(state, 50);
  });
});
