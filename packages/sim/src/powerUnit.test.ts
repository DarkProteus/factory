// Точечные тесты энергии: накопление заряда, спрос по draw, порядок сетей и раздача топлива (мутанты TASK-83).
import { buildings, items, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import type { BuildingDefs, PlacedBuilding } from './buildings';
import { createState, buildingAt, tick, type Command, type SimState } from './index';
import { FUEL_UNITS_PER_KJ } from './fuel';
import { POWER_SCALE, electricTick, energyTick, hasPower, powerStats, stepPower } from './power';
import { stocked } from './testKit';

const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });
const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;
const bare = (): PlacedBuilding => ({ id: 1, type: 'x', x: 0, y: 0, dir: 1 }) as PlacedBuilding;
const world = (): SimState => stocked(createState(1, { width: 60, height: 60 }));
const coal = (n: number): { item: string; count: number } => ({ item: 'coal', count: n });
const gen = (kw: number): BuildingDef => ({ ...buildings.generator, energy: { kind: 'generator', kw } }) as BuildingDef;

describe('electricTick: заряд', () => {
  it('вне сети: false, без спроса и заряда', () => {
    const b = bare();
    expect(electricTick(b, undefined)).toBe(false);
    expect(b.draw).toBeUndefined();
    expect('charge' in b).toBe(false);
  });

  it('полная удовлетворённость: работа каждый тик, заряд не копится, спрос отмечен', () => {
    const b = bare();
    expect(electricTick(b, POWER_SCALE)).toBe(true);
    expect(b.draw).toBe(true);
    expect('charge' in b).toBe(false);
  });

  it('нулевая удовлетворённость: false, спрос отмечен, поля заряда нет', () => {
    const b = bare();
    expect(electricTick(b, 0)).toBe(false);
    expect(b.draw).toBe(true);
    expect('charge' in b).toBe(false);
  });

  it('дробная: заряд копится, при переполнении остаток переносится', () => {
    const b = bare();
    expect(electricTick(b, 40000)).toBe(false);
    expect(b.charge).toBe(40000);
    expect(electricTick(b, 40000)).toBe(true);
    expect(b.charge).toBe(80000 - POWER_SCALE);
  });

  it('половина: чередует отказ и работу, заряд после работы снова пуст (поля нет)', () => {
    const b = bare();
    expect(electricTick(b, POWER_SCALE / 2)).toBe(false);
    expect(electricTick(b, POWER_SCALE / 2)).toBe(true);
    expect('charge' in b).toBe(false);
  });
});

describe('hasPower и energyTick', () => {
  it('hasPower: вне сети — нет и без спроса; в сети без энергии — нет, но спрос есть; с энергией — да', () => {
    const a = bare();
    expect(hasPower(a, undefined)).toBe(false);
    expect(a.draw).toBeUndefined();
    const z = bare();
    expect(hasPower(z, 0)).toBe(false);
    expect(z.draw).toBe(true);
    const ok = bare();
    expect(hasPower(ok, 1)).toBe(true);
    expect(ok.draw).toBe(true);
  });

  it('energyTick: fuel — через топливо, electric — через сеть, прочее — всегда работает', () => {
    const furnace = { energy: { kind: 'fuel', kw: 90 } } as BuildingDef;
    const dry = bare();
    expect(energyTick(dry, furnace, POWER_SCALE)).toBe(false);
    const fed = bare();
    fed.fuel = coal(1);
    expect(energyTick(fed, furnace, undefined)).toBe(true);
    const electric = { energy: { kind: 'electric', kw: 10 } } as BuildingDef;
    const e = bare();
    expect(energyTick(e, electric, undefined)).toBe(false);
    expect(e.draw).toBeUndefined();
    expect(energyTick(e, electric, POWER_SCALE)).toBe(true);
    expect(e.draw).toBe(true);
    for (const def of [{ energy: { kind: 'generator', kw: 5 } }, {}] as BuildingDef[]) {
      const g = bare();
      expect(energyTick(g, def, 0)).toBe(true);
      expect(g.draw).toBeUndefined();
    }
  });
});

describe('stepPower: спрос, сети и топливо', () => {
  it('сети идут по возрастанию id, даже если потребитель старшей сети построен раньше', () => {
    const state = world();
    // Столбы 1 и 2 далеко друг от друга; сборщик у столба 2 получает id раньше сборщика у столба 1.
    tick(state, [build('pole', 5, 5), build('pole', 30, 30), build('assembler', 30, 31), build('assembler', 5, 6)]);
    const [p1, p2] = [at(state, 5, 5).id, at(state, 30, 30).id];
    stepPower(state);
    expect([...powerStats(state).networks.keys()]).toEqual([p1, p2]);
    expect(p1).toBeLessThan(p2);
  });

  it('сеть из одних генераторов: полная удовлетворённость, топливо не тратится', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('generator', 5, 6)]);
    const g = at(state, 5, 6);
    g.fuel = coal(3);
    const r = stepPower(state);
    expect([...r.networks.values()]).toEqual([{ supply: 900, demand: 0, satisfaction: POWER_SCALE }]);
    expect(g.fuel).toEqual(coal(3));
    expect(g.burn).toBeUndefined();
    // Потребителей нет: byBuilding пуст.
    expect(r.byBuilding.size).toBe(0);
  });

  it('сеть без выработки и без спроса: удовлетворённость 0 (не NaN и не полная)', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('assembler', 5, 6), build('generator', 2, 6)]);
    const a = at(state, 5, 6);
    const r = stepPower(state);
    expect([...r.networks.values()]).toEqual([{ supply: 0, demand: 0, satisfaction: 0 }]);
    expect(r.byBuilding.get(a.id)).toBe(0);
  });

  it('сеть из одних потребителей: нет выработки — удовлетворённость 0, потребитель в byBuilding', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('assembler', 5, 6)]);
    const a = at(state, 5, 6);
    a.draw = true;
    const r = stepPower(state);
    expect([...r.networks.values()]).toEqual([{ supply: 0, demand: 75, satisfaction: 0 }]);
    expect(r.byBuilding.get(a.id)).toBe(0);
    expect(a.draw).toBeUndefined();
  });

  it('спрос — только здания с draw; удовлетворённость округляется вниз и не выше 1', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('generator', 5, 6), build('assembler', 2, 6), build('assembler', 2, 2), build('lab', 6, 2)]);
    const [a1, a2, idle] = [at(state, 2, 6), at(state, 2, 2), at(state, 6, 2)];
    at(state, 5, 6).fuel = coal(5);
    a1.draw = true;
    a2.draw = true;
    // supply 100, demand 150: floor(100 * 65536 / 150) = 43690 (а не 43691 и не 43690.67).
    const defs = { ...buildings, generator: gen(100) } as BuildingDefs;
    let r = stepPower(state, defs);
    expect(idle.draw).toBeUndefined();
    expect([...r.networks.values()][0]).toEqual({ supply: 100, demand: 150, satisfaction: 43690 });
    expect(a1.draw).toBeUndefined();
    expect(a2.draw).toBeUndefined();
    // Спрос 75 при выработке 100: удовлетворённость ограничена единицей.
    a1.draw = true;
    r = stepPower(state, defs);
    expect([...r.networks.values()][0]!.satisfaction).toBe(POWER_SCALE);
  });

  it('флаг draw вне сети снимается и в спрос не входит', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('generator', 5, 6), build('assembler', 50, 50)]);
    const out = at(state, 50, 50);
    out.draw = true;
    const r = stepPower(state);
    expect(out.draw).toBeUndefined();
    expect(r.byBuilding.has(out.id)).toBe(false);
    expect([...r.networks.values()][0]!.demand).toBe(0);
  });

  it('генератор без топлива не вырабатывает: сеть на нуле, топливо остального не трогается', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('generator', 5, 6), build('generator', 2, 6), build('assembler', 2, 2)]);
    const [dead, live, a] = [at(state, 5, 6), at(state, 2, 6), at(state, 2, 2)];
    live.fuel = coal(2);
    a.draw = true;
    const r = stepPower(state);
    expect([...r.networks.values()][0]).toEqual({ supply: 900, demand: 75, satisfaction: POWER_SCALE });
    expect(dead.fuel).toBeUndefined();
    expect(dead.burn).toBeUndefined();
    expect(live.fuel!.count + (live.burn ?? 0) / (items.coal.fuel * FUEL_UNITS_PER_KJ)).toBeCloseTo(2 - 75_000 / (items.coal.fuel * FUEL_UNITS_PER_KJ), 10);
  });

  it('нагрузка делится по kw, остаток деления уходит первому по id', () => {
    const state = world();
    tick(state, [build('pole', 5, 5), build('generator', 5, 6), build('generator', 2, 6), build('assembler', 2, 2)]);
    const [g1, g2, a] = [at(state, 5, 6), at(state, 2, 6), at(state, 2, 2)];
    g1.fuel = coal(5);
    g2.fuel = coal(5);
    g2.type = 'generator2';
    a.draw = true;
    const defs = { ...buildings, generator: gen(900), generator2: gen(700) } as BuildingDefs;
    stepPower(state, defs);
    const unit = items.coal.fuel * FUEL_UNITS_PER_KJ;
    const spent = (g: PlacedBuilding): number => 5 * unit - (g.fuel!.count * unit + (g.burn ?? 0));
    // delivered = 75 000; 75 000 * 900 / 1600 = 42187.5, 75 000 * 700 / 1600 = 32812.5; сумма 74 999, остаток 1 — первому.
    expect(spent(g1)).toBe(42188);
    expect(spent(g2)).toBe(32812);
  });
});

describe('powerStats', () => {
  it('до первого шага — пустые карты', () => {
    const stats = powerStats(createState(1, { width: 4, height: 4 }));
    expect(stats.byBuilding).toBeInstanceOf(Map);
    expect(stats.networks).toBeInstanceOf(Map);
    expect(stats.byBuilding.size).toBe(0);
    expect(stats.networks.size).toBe(0);
  });
});
