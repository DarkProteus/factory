import { applyCommand, createState, tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { badgeAlpha, badges, ghostLinks, wireSegments, zoneRect } from './powerView';

/** Состояние с предметами-зданиями в инвентаре; place ставит здание командой. */
function world(deposits: { x: number; y: number }[] = []) {
  const state = createState(1, {
    width: 32,
    height: 32,
    deposits: deposits.map((d) => ({ ...d, item: 'ironOre', amount: 100 })),
  });
  const place = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3 = 0) => {
    state.inventory.push({ item: building, count: 1 });
    applyCommand(state, { type: 'build', building, x, y, dir });
    return Object.values(state.buildings).find((b) => b.type === building && b.x === x && b.y === y)!;
  };
  return { state, place };
}

const run = (state: SimState, n = 3) => {
  for (let i = 0; i < n; i++) tick(state, []);
};

describe('зона столба', () => {
  it('квадрат 5×5 вокруг клетки столба', () => {
    expect(zoneRect({ x: 10, y: 10 }, 5, 32, 32)).toEqual({ x: 8, y: 8, w: 5, h: 5 });
  });

  it('обрезается краями карты', () => {
    expect(zoneRect({ x: 0, y: 31 }, 5, 32, 32)).toEqual({ x: 0, y: 29, w: 3, h: 3 });
  });
});

describe('провода', () => {
  it('отрезки идут от центра столба к центру столба', () => {
    const { state, place } = world();
    place('pole', 2, 2);
    place('pole', 6, 2);
    place('pole', 25, 25);
    expect(wireSegments(state)).toEqual([[80, 80, 208, 80]]);
  });

  it('пунктир призрака — к столбам в радиусе провода, дальние не берутся', () => {
    const { state, place } = world();
    const a = place('pole', 2, 2);
    const b = place('pole', 9, 2);
    place('pole', 25, 25);
    // Расстояние до a — 3, до b — 4, до третьего — далеко; 7 клеток по прямой — предел, 8 уже далеко.
    expect(ghostLinks(state, { x: 5, y: 2 }, 'pole')).toEqual([a.id, b.id]);
    expect(ghostLinks(state, { x: 17, y: 2 }, 'pole')).toEqual([]);
    expect(ghostLinks(state, { x: 17, y: 2 }, 'drill')).toEqual([]);
  });
});

describe('значок «нет энергии»', () => {
  it('бур с залежью вне сети — значок над центром верхнего края', () => {
    const { state, place } = world([{ x: 4, y: 5 }]);
    const drill = place('drill', 4, 5);
    run(state);
    expect(badges(state)).toEqual([{ id: drill.id, kind: 'power', x: 160, y: 154 }]);
  });

  it('значок не поворачивается: у сборщика 3×3 центр верхнего края в экранной ориентации', () => {
    const { state, place } = world();
    const asm = place('assembler', 4, 5, 1);
    asm.recipe = 'ironGear';
    run(state);
    expect(badges(state)).toEqual([{ id: asm.id, kind: 'power', x: 4 * 32 + 48, y: 5 * 32 - 6 }]);
  });

  it('бур без залежи и сборщик без рецепта значка не показывают', () => {
    const { state, place } = world();
    place('drill', 4, 5);
    place('assembler', 10, 5);
    run(state);
    expect(badges(state)).toEqual([]);
  });

  it('в сети с нулевой удовлетворённостью значок есть, с питанием — нет', () => {
    const { state, place } = world([{ x: 4, y: 5 }]);
    place('pole', 3, 3);
    const gen = place('generator', 0, 0);
    const drill = place('drill', 4, 5);
    run(state);
    expect(badges(state).map((x) => [x.id, x.kind])).toContainEqual([drill.id, 'power']);
    gen.fuel = { item: 'coal', count: 5 };
    run(state);
    expect(badges(state).filter((x) => x.kind === 'power')).toEqual([]);
  });

  it('манипулятор вне сети тоже показывает значок', () => {
    const { state, place } = world();
    const ins = place('inserter', 4, 4);
    run(state);
    expect(badges(state)).toMatchObject([{ id: ins.id, kind: 'power' }]);
  });
});

describe('значок «нет топлива»', () => {
  it('печь без топлива показывает значок, только если во входе есть руда или идёт цикл', () => {
    const { state, place } = world();
    const furnace = place('furnace', 4, 5);
    expect(badges(state)).toEqual([]);
    furnace.input = [{ item: 'ironOre', count: 1 }];
    expect(badges(state)).toMatchObject([{ id: furnace.id, kind: 'fuel' }]);
    furnace.input = [{ item: 'ironOre', count: 0 }];
    furnace.progress = 5;
    expect(badges(state)).toMatchObject([{ id: furnace.id, kind: 'fuel' }]);
    furnace.progress = 0;
    expect(badges(state)).toEqual([]);
  });

  it('печь с топливом или остатком энергии на тик значка не показывает', () => {
    const { state, place } = world();
    const furnace = place('furnace', 4, 5);
    furnace.input = [{ item: 'ironOre', count: 1 }];
    furnace.fuel = { item: 'coal', count: 1 };
    expect(badges(state)).toEqual([]);
    delete furnace.fuel;
    furnace.burn = 90 * 1000;
    expect(badges(state)).toEqual([]);
    furnace.burn = 90 * 1000 - 1;
    expect(badges(state)).toHaveLength(1);
  });

  it('генератор без топлива — значок только при наличии потребителей в сети', () => {
    const { state, place } = world();
    place('pole', 3, 3);
    const gen = place('generator', 0, 0);
    run(state);
    expect(badges(state)).toEqual([]);
    place('inserter', 4, 4);
    gen.fuel = { item: 'coal', count: 1 };
    run(state);
    delete gen.fuel;
    gen.burn = 0;
    expect(badges(state).filter((x) => x.kind === 'fuel')).toMatchObject([{ id: gen.id }]);
    gen.burn = 5;
    expect(badges(state).filter((x) => x.kind === 'fuel')).toEqual([]);
  });
});

describe('мигание значка', () => {
  it('α = 0.55 + 0.45 × sin(тик × 0.15)', () => {
    expect(badgeAlpha(0)).toBeCloseTo(0.55);
    expect(badgeAlpha(Math.PI / 2 / 0.15)).toBeCloseTo(1);
  });
});
