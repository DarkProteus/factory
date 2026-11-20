import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { furnaceLamp, type BuildingView } from './buildings';
import { assemblerLamp, assemblerProduct, generatorLamp } from './buildingsM2';

const view = (extra: Partial<BuildingView> = {}): BuildingView => ({ id: 1, type: 'x', x: 0, y: 0, dir: 0, progress: 0, output: null, ...extra });

describe('лампы M2', () => {
  it('печь без топлива — off, с топливом по прогрессу', () => {
    expect(furnaceLamp(view({ progress: 5 }), buildings.furnace)).toBe('off');
    expect(furnaceLamp(view({ progress: 5, fuel: { item: 'coal', count: 1 } }), buildings.furnace)).toBe('work');
    // Остаток сожжённой энергии на тик хватает: цикл идёт и без предметов в ячейке.
    expect(furnaceLamp(view({ progress: 5, burn: 90_000 }), buildings.furnace)).toBe('work');
    expect(furnaceLamp(view({ fuel: { item: 'coal', count: 1 }, recipe: 'smeltIron' }), buildings.furnace)).toBe('wait');
  });

  it('сборщик: без рецепта off, с рецептом ждёт или работает; продукт — первый выход', () => {
    expect(assemblerLamp(view())).toBe('off');
    expect(assemblerLamp(view({ recipe: 'circuit' }))).toBe('wait');
    expect(assemblerLamp(view({ recipe: 'circuit', progress: 3 }))).toBe('work');
    expect(assemblerProduct(view({ recipe: 'ironGear' }))).toBe('ironGear');
    expect(assemblerProduct(view())).toBeUndefined();
  });

  it('генератор: без топлива off, с топливом без нагрузки wait', () => {
    expect(generatorLamp(view())).toBe('off');
    expect(generatorLamp(view({ fuel: { item: 'coal', count: 2 } }))).toBe('wait');
  });
});
