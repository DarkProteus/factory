import { buildings, items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { demolishAt, type BuildingDefs, type PlacedBuilding } from './buildings';
import { applyCommand, buildingAt, createState, hash, tick, type Command, type SimState } from './index';
import { powerNetworks } from './network';
import { POWER_SCALE, powerStats } from './power';
import { runBehaviors } from './behaviors';
import { stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3 = 1): Command => ({ type: 'build', building, x, y, dir });
const world = (): SimState => stocked(createState(1, { width: 40, height: 40 }));
const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;

/** Генератор (0,0) с углём, столб (4,1); сборщики 3×3 рядом со столбом в зоне покрытия. */
function plant(assemblers: [number, number][]): { state: SimState; gen: PlacedBuilding; asm: PlacedBuilding[] } {
  const state = world();
  tick(state, [build('generator', 0, 0), build('pole', 4, 1), ...assemblers.map(([x, y]) => build('assembler', x, y))]);
  const gen = at(state, 0, 0);
  gen.fuel = { item: 'coal', count: items.coal.stack };
  const asm = assemblers.map(([x, y]) => at(state, x, y));
  for (const a of asm) applyCommand(state, { type: 'setRecipe', building: a.id, recipe: 'ironGear' });
  return { state, gen, asm };
}

/** Кладёт пластины на вход сборщика (шестерня = 2 пластины). */
const feed = (a: PlacedBuilding, plates: number): void => {
  a.input = [{ item: 'ironPlate', count: plates }];
};

/** Шаг поведений с таблицей зданий, где у генератора другая мощность. */
function runWith(state: SimState, defs: BuildingDefs, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    runBehaviors(state, defs);
    state.tick += 1;
  }
}

const weakGenerator = (kw: number): BuildingDefs => ({ ...buildings, generator: { ...buildings.generator, energy: { kind: 'generator', kw } } });

describe('электросеть: столбы и сети', () => {
  it('столбы в радиусе wireReach образуют одну сеть, дальше — отдельную; id сети — меньший id столба', () => {
    const state = world();
    // (2,2)-(9,2): 7 клеток — соединены; (9,2)-(17,2): 8 — нет.
    tick(state, [build('pole', 2, 2), build('pole', 9, 2), build('pole', 17, 2)]);
    const [a, b, c] = [at(state, 2, 2), at(state, 9, 2), at(state, 17, 2)];
    const nets = powerNetworks(state);
    expect(nets.poleNet.get(a.id)).toBe(a.id);
    expect(nets.poleNet.get(b.id)).toBe(a.id);
    expect(nets.poleNet.get(c.id)).toBe(c.id);
    expect(nets.wires).toEqual([[a.id, b.id]]);
  });

  it('по диагонали считается евклидово расстояние', () => {
    const state = world();
    // dx=5, dy=5: √50 > 7 — не соединены; dx=4, dy=5: √41 — соединены.
    tick(state, [build('pole', 0, 0), build('pole', 5, 5), build('pole', 20, 0), build('pole', 24, 5)]);
    const nets = powerNetworks(state);
    expect(nets.poleNet.get(at(state, 5, 5).id)).toBe(at(state, 5, 5).id);
    expect(nets.poleNet.get(at(state, 24, 5).id)).toBe(at(state, 20, 0).id);
  });

  it('стройка столба соединяет сети, снос — разделяет', () => {
    const state = world();
    tick(state, [build('pole', 2, 2), build('pole', 16, 2)]);
    const [a, c] = [at(state, 2, 2), at(state, 16, 2)];
    expect(powerNetworks(state).poleNet.get(c.id)).toBe(c.id);
    tick(state, [build('pole', 9, 2)]);
    expect(powerNetworks(state).poleNet.get(c.id)).toBe(a.id);
    demolishAt(state, 9, 2);
    expect(powerNetworks(state).poleNet.get(c.id)).toBe(c.id);
  });

  it('здание в сети, если хоть одна его клетка в квадрате 5×5 столба', () => {
    const state = world();
    // Столб (10,10) покрывает 8..12 по обеим осям.
    tick(state, [build('pole', 10, 10), build('inserter', 12, 12), build('inserter', 13, 10), build('assembler', 5, 5), build('assembler', 4, 13)]);
    const nets = powerNetworks(state);
    const pole = at(state, 10, 10).id;
    expect(nets.buildingNet.get(at(state, 12, 12).id)).toBe(pole);
    expect(nets.buildingNet.has(at(state, 13, 10).id)).toBe(false);
    // Сборщик (5..7, 5..7) не задевает 8..12; (4..6, 13..15) — тоже.
    expect(nets.buildingNet.has(at(state, 5, 5).id)).toBe(false);
    expect(nets.buildingNet.has(at(state, 4, 13).id)).toBe(false);
  });

  it('здание в зонах двух несвязанных сетей — в сети столба с меньшим id', () => {
    const state = world();
    // Столбы по диагонали (16,26) и (10,20): √72 > 7 — разные сети.
    // Сборщик (12..14, 22..24) задевает зону (10,20) клеткой (12,22) и зону (16,26) клеткой (14,24).
    tick(state, [build('pole', 16, 26), build('pole', 10, 20), build('assembler', 12, 22)]);
    const nets = powerNetworks(state);
    const [first, second] = [at(state, 16, 26).id, at(state, 10, 20).id];
    expect(first).toBeLessThan(second);
    expect(nets.poleNet.get(second)).toBe(second);
    expect(nets.buildingNet.get(at(state, 12, 22).id)).toBe(first);
  });
});

// rule: power-satisfaction
describe('электросеть: удовлетворённость', () => {
  it('один сборщик на 900 кВт генератора работает в полную силу', () => {
    const { state, asm } = plant([[6, 0]]);
    feed(asm[0]!, 10);
    for (let i = 0; i < 30; i++) tick(state, []);
    const net = [...powerStats(state).networks.values()][0]!;
    expect(net.supply).toBe(900);
    expect(net.demand).toBe(75);
    expect(net.satisfaction).toBe(POWER_SCALE);
    // ironGear: 30 тиков, цикл стартует в первом тике после выбора рецепта.
    expect(asm[0]!.output).toEqual({ item: 'ironGear', count: 1 });
  });

  it('удовлетворённость = выработка / спрос работающих: два сборщика на 75 кВт — половина', () => {
    const { state, asm } = plant([[6, 0], [6, 3]]);
    const defs = weakGenerator(75);
    feed(asm[0]!, 100);
    feed(asm[1]!, 100);
    runWith(state, defs, 1 + 600);
    const net = [...powerStats(state).networks.values()][0]!;
    expect(net.demand).toBe(150);
    expect(net.satisfaction).toBe(POWER_SCALE / 2);
    // 600 тиков на половине скорости ≈ 300 тиков работы = 10 шестерён (по 30 тиков) каждому.
    expect(asm[0]!.output).toEqual({ item: 'ironGear', count: 10 });
    expect(asm[1]!.output).toEqual({ item: 'ironGear', count: 10 });
  });

  // rule: idle-power
  it('простаивающий сборщик не входит в спрос: работающий идёт в полную силу', () => {
    const { state, asm } = plant([[6, 0], [6, 3]]);
    const defs = weakGenerator(75);
    feed(asm[0]!, 100);
    runWith(state, defs, 1 + 600);
    const net = [...powerStats(state).networks.values()][0]!;
    expect(net.demand).toBe(75);
    expect(net.satisfaction).toBe(POWER_SCALE);
    expect(asm[0]!.output).toEqual({ item: 'ironGear', count: 20 });
    expect(asm[1]!.output).toBeNull();
  });

  it('сборщик вне сети стоит', () => {
    const state = world();
    tick(state, [build('generator', 0, 0), build('pole', 4, 1), build('assembler', 20, 20)]);
    at(state, 0, 0).fuel = { item: 'coal', count: 10 };
    const a = at(state, 20, 20);
    applyCommand(state, { type: 'setRecipe', building: a.id, recipe: 'ironGear' });
    feed(a, 10);
    for (let i = 0; i < 200; i++) tick(state, []);
    expect(a.progress).toBe(0);
    expect(a.output).toBeNull();
    expect(a.draw).toBeUndefined();
  });

  it('бур и манипулятор идут со скоростью × удовлетворённость', () => {
    const state = stocked(createState(1, { width: 40, height: 40, deposits: [{ x: 6, y: 0, item: 'ironOre', amount: 1000 }] }));
    // Бур (6,0) кладёт в сундук (8,0); манипулятор (9,0) переносит в сундук (10,0).
    tick(state, [build('generator', 0, 0), build('pole', 4, 1), build('drill', 6, 0), build('chest', 8, 0), build('inserter', 9, 0), build('chest', 10, 0), build('pole', 9, 2)]);
    at(state, 0, 0).fuel = { item: 'coal', count: items.coal.stack };
    // Спрос 90 + 13 = 103 кВт, пока манипулятор занят, и 90 — пока ждёт; генератор 51.5 кВт: скорость 0.50..0.57.
    runWith(state, weakGenerator(51.5), 1200);
    const net = [...powerStats(state).networks.values()][0]!;
    expect(net.satisfaction).toBeLessThan(POWER_SCALE * 0.6);
    const mined = (at(state, 8, 0).slots?.[0]?.count ?? 0) + (at(state, 10, 0).slots?.[0]?.count ?? 0) + (at(state, 9, 0).output?.count ?? 0) + (at(state, 6, 0).output?.count ?? 0);
    // Полная скорость — 20 руды за 1200 тиков (miningTicks 60); здесь 10..12.
    expect(mined).toBeGreaterThanOrEqual(10);
    expect(mined).toBeLessThanOrEqual(12);
    expect(at(state, 10, 0).slots?.[0]?.count ?? 0).toBeGreaterThan(0);
  });
});

describe('электросеть: генератор', () => {
  it('жжёт топливо по реальной нагрузке: 75 кВт = 75 000 Вт·тик за тик', () => {
    const { state, gen, asm } = plant([[6, 0]]);
    feed(asm[0]!, 100);
    for (let i = 0; i < 3; i++) tick(state, []);
    const before = gen.burn!;
    for (let i = 0; i < 10; i++) tick(state, []);
    expect(before - gen.burn!).toBe(10 * 75_000);
  });

  it('без нагрузки топливо не тратится', () => {
    const { state, gen } = plant([[6, 0]]);
    for (let i = 0; i < 100; i++) tick(state, []);
    expect(gen.fuel).toEqual({ item: 'coal', count: items.coal.stack });
    expect(gen.burn ?? 0).toBe(0);
  });

  it('без топлива даёт 0: сборщики стоят, а с топливом снова идут', () => {
    const { state, gen, asm } = plant([[6, 0]]);
    delete gen.fuel;
    feed(asm[0]!, 10);
    for (let i = 0; i < 100; i++) tick(state, []);
    expect([...powerStats(state).networks.values()][0]!.satisfaction).toBe(0);
    expect(asm[0]!.output).toBeNull();
    gen.fuel = { item: 'coal', count: 1 };
    for (let i = 0; i < 30; i++) tick(state, []);
    expect(asm[0]!.output).toEqual({ item: 'ironGear', count: 1 });
  });

  it('нагрузка делится между генераторами пропорционально мощности', () => {
    const { state, gen, asm } = plant([[6, 0]]);
    tick(state, [build('generator', 0, 3)]);
    const second = at(state, 0, 3);
    second.fuel = { item: 'coal', count: 10 };
    feed(asm[0]!, 100);
    for (let i = 0; i < 3; i++) tick(state, []);
    const [b1, b2] = [gen.burn!, second.burn!];
    for (let i = 0; i < 10; i++) tick(state, []);
    expect(b1 - gen.burn! + (b2 - second.burn!)).toBe(10 * 75_000);
    expect(b1 - gen.burn!).toBe(b2 - second.burn!);
  });
});

describe('электросеть: детерминизм', () => {
  const scenario = (): SimState => {
    const { state, asm } = plant([[6, 0], [6, 3]]);
    feed(asm[0]!, 100);
    feed(asm[1]!, 40);
    return state;
  };

  it('два прогона с сетью дают один хеш', () => {
    const a = scenario();
    const b = scenario();
    for (let i = 0; i < 500; i++) {
      tick(a, []);
      tick(b, []);
    }
    expect(hash(a)).toBe(hash(b));
  });

  it('сеть выводится из сохранённого: копия через JSON продолжает с тем же хешем', () => {
    const a = scenario();
    for (let i = 0; i < 250; i++) tick(a, []);
    const b = JSON.parse(JSON.stringify(a)) as SimState;
    for (let i = 0; i < 250; i++) {
      tick(a, []);
      tick(b, []);
    }
    expect(hash(b)).toBe(hash(a));
  });

  it('флаг спроса входит в хеш', () => {
    const a = scenario();
    tick(a, []);
    const h = hash(a);
    const consumer = Object.values(a.buildings).find((x) => x.draw)!;
    delete consumer.draw;
    expect(hash(a)).not.toBe(h);
  });
});
