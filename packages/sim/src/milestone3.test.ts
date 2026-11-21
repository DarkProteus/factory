// Тест готовности M3 (docs/design.md, «Готовность M3»): завод красных и зелёных пакетов с лабораториями
// проходит logistics, scienceGreen и steel; при урезанной генерации — пропорционально дольше.
// Раскладка — milestone3.layout.ts: 4 модуля по лаборатории, пакеты собираются в сборщиках, лаборатории
// кормятся манипуляторами из сундука-узла, энергия идёт из сети (столбы + 4 генератора на угле).
// Упрощения: пластины железа и меди и схемы (для манипуляторов зелёных пакетов) лежат в сундуках
// (буры, печи и цепочка схем не строятся — они проверены тестом M2); шестерни, красные пакеты, манипуляторы,
// конвейеры и зелёные пакеты делаются в сборщиках. Сундуки конечны, но хватает на весь прогон.
import { buildings, technologies, type TechId } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { runBehaviors } from './behaviors';
import type { BuildingDefs } from './buildings';
import { applyCommand } from './commands';
import { buildingAt, createState, type SimState } from './index';
import { powerNetworks } from './network';
import { POWER_SCALE, powerStats } from './power';
import { buildPlant, GENERATORS, greenAssemblers, MAP, MODULES } from './milestone3.layout';

const MINUTE = 60 * 60;
/** Технологии по порядку; каждая включается командой setResearch, когда предыдущая изучена. */
const PLAN: TechId[] = ['logistics', 'scienceGreen', 'steel'];
/** Лабораторий в заводе. */
const LABS = MODULES;
/** Тиков работы лабораторий на все три технологии; делится на число лабораторий. */
const LAB_TICKS = PLAN.reduce((n, t) => n + technologies[t].units * technologies[t].unitTicks, 0);
/** Идеальное время (лаборатории не ждут пакетов, сеть полная): 60000 / 4 = 15000 тиков = 4 мин 10 с. */
const IDEAL = LAB_TICKS / LABS;
/** Доля полной выработки (3600 кВт на 4 генератора), при которой завод упирается в энергию: спрос в среднем ~1700 кВт. */
const THIRD = 1 / 3;
/** Мощность одного генератора из content. */
const GEN_KW = buildings.generator.energy.kw;
/** Лимит для vitest: прогон занимает секунды, но при параллельном запуске файлов медленнее. */
const SLOW = 60_000;
/**
 * Заданное время для полной генерации: 5,5 игровых минуты. Факт прогона — 15957 тиков (4 мин 26 с, идеал 15000: сборщики
 * дают пакеты быстрее, чем лаборатории их тратят, потеря — запуск цепочек); 5,5 мин — запас около 24 %.
 */
const FULL_LIMIT = 5.5 * MINUTE;

/** Таблица зданий, где генератор выдаёт kw. */
const withGenerator = (kw: number): BuildingDefs => ({ ...buildings, generator: { ...buildings.generator, energy: { kind: 'generator', kw } } });

function plant(): SimState {
  const state = createState(1, MAP);
  buildPlant(state);
  return state;
}

interface Run {
  /** Тик изучения каждой технологии плана; нет — не изучена к лимиту. */
  doneAt: Partial<Record<TechId, number>>;
  minSatisfaction: number;
  maxDemand: number;
  /** Сумма спроса сети по тикам, кВт·тик: сколько энергии заводу нужно на работу. */
  energy: number;
}

/** Гоняет завод до изучения плана или limit тиков (поведения вручную, как milestone2); технологии включает командами. */
function run(state: SimState, defs: BuildingDefs, limit: number): Run {
  const doneAt: Run['doneAt'] = {};
  let minSatisfaction = POWER_SCALE;
  let maxDemand = 0;
  let energy = 0;
  for (let t = 0; t < limit && !(PLAN.at(-1)! in doneAt); t++) {
    state.events.length = 0;
    if (state.research.active === null) {
      const next = PLAN.find((id) => !state.research.done.includes(id));
      if (next) applyCommand(state, { type: 'setResearch', tech: next });
      // Зелёный пакет открыт — сборщикам зелёных пакетов ставится рецепт.
      for (const a of greenAssemblers()) {
        if (state.research.unlocked.includes('sciencePackGreen' as never)) {
          applyCommand(state, { type: 'setRecipe', building: buildingAt(state, a.x, a.y)!.id, recipe: 'sciencePackGreen' });
        }
      }
    }
    runBehaviors(state, defs);
    state.tick += 1;
    for (const e of state.events) if (e.type === 'researchDone') doneAt[e.tech] = state.tick;
    const net = [...powerStats(state).networks.values()][0]!;
    minSatisfaction = Math.min(minSatisfaction, net.satisfaction);
    maxDemand = Math.max(maxDemand, net.demand);
    energy += net.demand;
  }
  return { doneAt, minSatisfaction, maxDemand, energy };
}

let fullRun: Run | undefined;
const full = (): Run => (fullRun ??= run(plant(), buildings, 20 * MINUTE));
/** Урезанная генерация: каждый генератор даёт долю share своей мощности. */
const reduced = (share: number): Run => run(plant(), withGenerator(GEN_KW * share), 30 * MINUTE);

describe('готовность M3: завод пакетов', () => {
  it('раскладка: все электрические здания в одной сети с генераторами', () => {
    const state = plant();
    const nets = powerNetworks(state);
    const gens = Object.values(state.buildings).filter((b) => b.type === 'generator');
    expect(gens).toHaveLength(GENERATORS);
    const netId = nets.buildingNet.get(gens[0]!.id);
    expect(netId).toBeDefined();
    const defs = buildings as BuildingDefs;
    const powered = Object.values(state.buildings).filter((b) => ['electric', 'generator'].includes(defs[b.type]?.energy?.kind ?? ''));
    expect(powered.filter((b) => b.type === 'lab')).toHaveLength(LABS);
    for (const b of powered) expect(nets.buildingNet.get(b.id), `${b.type} (${b.x},${b.y})`).toBe(netId);
    // Пакеты собираются в сборщиках: по 7 на модуль (3 шестерённых, красный, манипуляторы, конвейеры, зелёный).
    expect(Object.values(state.buildings).filter((b) => b.type === 'assembler')).toHaveLength(7 * MODULES);
  });

  it('завод проходит logistics, scienceGreen и steel за заданное время', () => {
    const r = full();
    expect(Object.keys(r.doneAt)).toEqual(PLAN);
    const { logistics, scienceGreen, steel } = r.doneAt as Record<TechId, number>;
    expect(logistics).toBeLessThan(scienceGreen);
    expect(scienceGreen).toBeLessThan(steel);
    // Быстрее идеала (лаборатории не ждут пакетов) пройти нельзя, медленнее заданного — слишком медленный завод.
    expect(steel).toBeGreaterThanOrEqual(IDEAL);
    expect(steel).toBeLessThanOrEqual(FULL_LIMIT);
    // Генераторов хватает с запасом: сеть удовлетворена всё время.
    expect(r.minSatisfaction).toBe(POWER_SCALE);
    expect(GENERATORS * GEN_KW).toBeGreaterThan(r.maxDemand);
  }, SLOW);

  it('при урезанной генерации время растёт пропорционально недостающей энергии', () => {
    const f = full();
    const base = f.doneAt.steel!;
    const third = reduced(THIRD);
    const supply = GENERATORS * GEN_KW * THIRD; // 1200 кВт — меньше среднего спроса завода (~1700 кВт)
    expect(third.minSatisfaction).toBeLessThan(POWER_SCALE);
    expect(third.maxDemand).toBeGreaterThan(supply);
    const t = third.doneAt.steel!;
    expect(t / base).toBeGreaterThanOrEqual(1.2);
    expect(t / base).toBeLessThanOrEqual(1.7);
    // Пропорциональность: заводу нужно столько энергии, сколько он потребил на полной выработке (энергия = сумма спроса
    // по тикам); при дефиците работа идёт со скоростью выработки, поэтому время = энергия / выработка (допуск 10 %).
    const expected = f.energy / supply;
    expect(t).toBeGreaterThanOrEqual(expected * 0.9);
    expect(t).toBeLessThanOrEqual(expected * 1.1);
  }, SLOW * 2);
});
