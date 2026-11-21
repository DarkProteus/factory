import { buildings } from '@factory/content';
import { applyCommand, createState, tick, type Command, type Dir, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { drillLamp, furnaceLamp, type BuildingView } from './buildings';
import { assemblerLamp, assemblerProduct, generatorLamp, generatorLoad, splitterNext } from './buildingsM2';

function world(deposits: { x: number; y: number }[] = []) {
  const state = createState(1, { width: 32, height: 32, deposits: deposits.map((d) => ({ ...d, item: 'ironOre', amount: 100 })) });
  const place = (building: string, x: number, y: number) => {
    state.inventory.push({ item: building, count: 1 });
    applyCommand(state, { type: 'build', building, x, y, dir: 0 });
    return Object.values(state.buildings).find((b) => b.type === building && b.x === x && b.y === y)!;
  };
  return { state, place };
}

const run = (state: SimState, n = 5) => {
  for (let i = 0; i < n; i++) tick(state, []);
};

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
    // Сборщик в сети с работающим генератором.
    const { state, place } = world();
    place('pole', 3, 3);
    place('generator', 0, 0).fuel = { item: 'coal', count: 5 };
    const asm = place('assembler', 4, 4);
    run(state);
    expect(assemblerLamp(state, view())).toBe('off');
    expect(assemblerLamp(state, { ...view({ recipe: 'circuit' }), id: asm.id })).toBe('wait');
    expect(assemblerLamp(state, { ...view({ recipe: 'circuit', progress: 3 }), id: asm.id })).toBe('work');
    expect(assemblerProduct(view({ recipe: 'ironGear' }))).toBe('ironGear');
    expect(assemblerProduct(view())).toBeUndefined();
  });

  it('генератор: без топлива off, с топливом без нагрузки wait', () => {
    const { state } = world();
    expect(generatorLamp(state, view())).toBe('off');
    expect(generatorLamp(state, view({ fuel: { item: 'coal', count: 2 } }))).toBe('wait');
  });

  it('сборщик вне сети и при нулевой удовлетворённости — off', () => {
    const { state, place } = world();
    const out = place('assembler', 10, 10);
    out.recipe = 'circuit';
    run(state);
    expect(assemblerLamp(state, out)).toBe('off');
    // В сети, но генератор без топлива: удовлетворённость 0.
    place('pole', 8, 8);
    const inNet = place('assembler', 4, 4);
    inNet.recipe = 'circuit';
    place('generator', 0, 0);
    run(state);
    expect(assemblerLamp(state, inNet)).toBe('off');
  });

  it('бур вне сети и при нулевой удовлетворённости — off, с питанием — work', () => {
    const { state, place } = world([{ x: 4, y: 5 }]);
    const drill = place('drill', 4, 5);
    const def = buildings.drill;
    run(state);
    expect(drillLamp(state, drill, def)).toBe('off');
    place('pole', 3, 3);
    const gen = place('generator', 0, 0);
    run(state);
    expect(drillLamp(state, drill, def)).toBe('off');
    gen.fuel = { item: 'coal', count: 5 };
    run(state);
    expect(drillLamp(state, drill, def)).toBe('work');
  });

  it('нагрузка генератора = min(выработка, спрос) / выработка своей сети', () => {
    const { state, place } = world([{ x: 4, y: 5 }]);
    place('pole', 3, 3);
    const gen = place('generator', 0, 0);
    place('drill', 4, 5);
    gen.fuel = { item: 'coal', count: 5 };
    expect(generatorLoad(state, gen)).toBe(0);
    run(state);
    // Бур 90 кВт на генератор 900 кВт.
    expect(generatorLoad(state, gen)).toBeCloseTo(0.1);
    expect(generatorLamp(state, gen)).toBe('work');
  });

  it('нагрузка не больше 1 при спросе выше выработки', () => {
    const xs = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
    const { state, place } = world(xs.map((x) => ({ x, y: 5 })));
    for (const x of [3, 9, 15, 21, 27]) place('pole', x, 3);
    const gen = place('generator', 0, 0);
    for (const x of xs) place('drill', x, 5);
    gen.fuel = { item: 'coal', count: 50 };
    run(state, 10);
    expect(generatorLoad(state, gen)).toBe(1);
  });

  it('генератор с топливом без потребителей — wait, без топлива — off, вне сети нагрузки нет', () => {
    const { state, place } = world();
    place('pole', 3, 3);
    const gen = place('generator', 0, 0);
    const lone = place('generator', 20, 20);
    lone.fuel = { item: 'coal', count: 5 };
    gen.fuel = { item: 'coal', count: 5 };
    run(state);
    expect(generatorLoad(state, gen)).toBe(0);
    expect(generatorLamp(state, gen)).toBe('wait');
    expect(generatorLoad(state, lone)).toBe(0);
    delete gen.fuel;
    gen.burn = 0;
    expect(generatorLamp(state, gen)).toBe('off');
  });
});

describe('подсветка выхода разделителя', () => {
  it('подсвечен тот выход, в который sim отправит следующий предмет', () => {
    const state = createState(1, { width: 16, height: 16 });
    for (const [type, n] of [['splitter', 1], ['belt', 4]] as const) state.inventory.push({ item: type, count: n });
    // Разделитель смотрит на север (dir 0): вперёд (5,4), влево (4,5), вправо (6,5); лента на выходах смотрит от него.
    const outs: [number, number, Dir][] = [[5, 4, 0], [4, 5, 3], [6, 5, 1]];
    tick(state, [
      { type: 'build', building: 'splitter', x: 5, y: 5, dir: 0 },
      ...outs.map(([x, y, dir]): Command => ({ type: 'build', building: 'belt', x, y, dir })),
    ]);
    const s = Object.values(state.buildings).find((b) => b.type === 'splitter')!;
    const at = (x: number, y: number) => Object.values(state.buildings).find((b) => b.x === x && b.y === y)!;
    for (let n = 0; n < 6; n++) {
      s.belt = [{ item: 'ironOre', pos: 0 }];
      for (const [x, y] of outs) at(x, y).belt = [];
      const predicted = splitterNext(s);
      const before = outs.map(([x, y]) => at(x, y).belt?.length ?? 0);
      tick(state, []);
      const after = outs.map(([x, y]) => at(x, y).belt?.length ?? 0);
      expect(after.findIndex((c, i) => c > before[i]!)).toBe(predicted);
    }
  });

  it('с пустой очередью подсвечен первый выход', () => {
    expect(splitterNext({ progress: 0 } as BuildingView)).toBe(0);
    expect(splitterNext({ progress: 2 } as BuildingView)).toBe(2);
  });
});
