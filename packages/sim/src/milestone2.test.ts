// Тест готовности M2 (docs/design.md, «Готовность M2»): завод схем целиком, без помощника electrify.
import { buildings, recipes } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { runBehaviors } from './behaviors';
import type { BuildingDefs } from './buildings';
import { buildingAt, createState, tick, type Command, type Dir, type SimState } from './index';
import { powerNetworks } from './network';
import { POWER_SCALE, powerStats } from './power';
import { stocked } from './testKit';

/** 10 игровых минут в тиках (60 тиков в секунду). */
const TEN_MINUTES = 10 * 60 * 60;
/** 36000 тиков занимают пару секунд, а при параллельном прогоне всех пакетов втрое дольше: лимит vitest по умолчанию (5 с) мал. */
const SLOW = 30_000;
const CIRCUIT_CHEST = { x: 18, y: 12 };

const build = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });

/** Кладёт в сундук запас: руда (по стопке 50) идёт первой, уголь последним — манипулятор сначала наполняет вход печи, потом топливо. */
function stock(state: SimState, x: number, y: number, ore: string | null, coalStacks: number): void {
  const slots = Array.from({ length: ore ? 5 : 0 }, () => ({ item: ore!, count: 50 }));
  for (let i = 0; i < coalStacks; i++) slots.push({ item: 'coal', count: 50 });
  buildingAt(state, x, y)!.slots = slots;
}

/**
 * Завод схем, всё передаётся напрямую «источник → манипулятор → здание», конвейеров нет:
 *   медь: 4 печи → сборщик провода K (10,10) → ОДИН манипулятор (13,11) → сборщик схем C (14,10)
 *   железо: 3 печи → C;  C → манипулятор (17,12) → сундук схем (18,12)
 *   уголь: сундук (26,11) → манипулятор (27,11) → генератор (28,10); сеть из 9 столбов.
 * Руда и уголь печей лежат в сундуках-источниках. Печи на топливе (не электрические),
 * поэтому от сети зависят только сборщики и манипуляторы. Возвращает состояние и установленную
 * мощность потребителей (сумму kw всех электрических зданий).
 */
function plant(): { state: SimState; installedKw: number } {
  const state = stocked(createState(1, { width: 40, height: 30 }));
  tick(state, [
    build('assembler', 10, 10), // K: провод
    build('assembler', 14, 10), // C: схемы
    // Медь слева от K: сундук (5,y) → манипулятор (6,y) → печь (7..8) → манипулятор (9,y) → K.
    ...[10, 12].flatMap((y) => [build('chest', 5, y), build('inserter', 6, y), build('furnace', 7, y), build('inserter', 9, y)]),
    // Медь сверху и снизу от K.
    build('chest', 11, 5), build('inserter', 11, 6, 2), build('furnace', 11, 7), build('inserter', 11, 9, 2),
    build('chest', 11, 17), build('inserter', 11, 16, 0), build('furnace', 11, 14), build('inserter', 11, 13, 0),
    // K → C единственным манипулятором: он и есть узкое место цепочки.
    build('inserter', 13, 11),
    // Железо сверху, снизу и справа от C.
    build('chest', 14, 5), build('inserter', 14, 6, 2), build('furnace', 14, 7), build('inserter', 14, 9, 2),
    build('chest', 14, 17), build('inserter', 14, 16, 0), build('furnace', 14, 14), build('inserter', 14, 13, 0),
    build('chest', 21, 10), build('inserter', 20, 10, 3), build('furnace', 18, 10), build('inserter', 17, 10, 3),
    // Выход схем.
    build('inserter', 17, 12), build('chest', CIRCUIT_CHEST.x, CIRCUIT_CHEST.y),
    // Генератор с угольным сундуком.
    build('chest', 26, 11), build('inserter', 27, 11), build('generator', 28, 10),
    // Столбы: каждый манипулятор и сборщик в квадрате 5×5 какого-то столба, соседние столбы ближе wireReach 7.
    ...[[6, 11], [9, 11], [13, 6], [13, 9], [13, 12], [13, 16], [19, 12], [23, 12], [27, 12]].map(([x, y]) => build('pole', x!, y!)),
  ]);
  tick(state, [
    { type: 'setRecipe', building: buildingAt(state, 10, 10)!.id, recipe: 'copperCable' },
    { type: 'setRecipe', building: buildingAt(state, 14, 10)!.id, recipe: 'circuit' },
  ]);
  for (const [x, y] of [[5, 10], [5, 12], [11, 5], [11, 17]] as const) stock(state, x, y, 'copperOre', 1);
  for (const [x, y] of [[14, 5], [14, 17], [21, 10]] as const) stock(state, x, y, 'ironOre', 1);
  stock(state, 26, 11, null, 2);
  // Затравка: манипулятору генератора нужна энергия, чтобы подвезти первый уголь.
  buildingAt(state, 28, 10)!.fuel = { item: 'coal', count: 5 };
  const electric = Object.values(state.buildings).map((b) => (buildings as BuildingDefs)[b.type]?.energy);
  const installedKw = electric.reduce((sum, e) => sum + (e?.kind === 'electric' ? e.kw : 0), 0);
  return { state, installedKw };
}

/** Таблица зданий, где генератор выдаёт kw. */
const withGenerator = (kw: number): BuildingDefs => ({ ...buildings, generator: { ...buildings.generator, energy: { kind: 'generator', kw } } });

interface Run {
  circuits: number;
  /** Доля тиков с полностью удовлетворённой сетью. */
  satisfiedShare: number;
  minSatisfaction: number;
  maxDemand: number;
}

/** Гоняет завод `ticks` тиков под таблицей defs (поведения вручную, как power.test.ts); считает схемы в выходном сундуке. */
function run(state: SimState, defs: BuildingDefs, ticks: number): Run {
  let satisfied = 0;
  let minSatisfaction = POWER_SCALE;
  let maxDemand = 0;
  for (let i = 0; i < ticks; i++) {
    runBehaviors(state, defs);
    state.tick += 1;
    const net = [...powerStats(state).networks.values()][0]!;
    if (net.satisfaction === POWER_SCALE) satisfied += 1;
    minSatisfaction = Math.min(minSatisfaction, net.satisfaction);
    maxDemand = Math.max(maxDemand, net.demand);
  }
  const slots = buildingAt(state, CIRCUIT_CHEST.x, CIRCUIT_CHEST.y)!.slots ?? [];
  const circuits = slots.filter((s) => s.item === 'circuit').reduce((n, s) => n + s.count, 0);
  return { circuits, satisfiedShare: satisfied / ticks, minSatisfaction, maxDemand };
}

// Полный прогон на настоящем контенте (генератор 900 кВт) нужен обоим тестам и считается один раз.
let fullRun: Run | undefined;
const full = (): Run => (fullRun ??= run(plant().state, buildings, TEN_MINUTES));

/**
 * Расчёт: период каждой ступени в тиках на одну схему, из content. Узкое место — ступень с наибольшим периодом:
 * манипулятор K → C несёт по одному проводу, цикл = 1 тик захвата + swingTicks, а схеме нужно 3 провода.
 */
function stagePeriods(): Record<string, number> {
  const swingCycle = buildings.inserter.swingTicks + 1;
  const cables = recipes.circuit.in.copperCable; // проводов на схему
  const iron = recipes.circuit.in.ironPlate; // пластин железа на схему
  const cablesPerPlate = recipes.copperCable.out.copperCable / recipes.copperCable.in.copperPlate;
  return {
    cableInserter: swingCycle * cables,
    cableAssembler: (recipes.copperCable.ticks * cables) / recipes.copperCable.out.copperCable,
    circuitAssembler: recipes.circuit.ticks,
    copperFurnaces: (recipes.smeltCopper.ticks * cables) / (4 * cablesPerPlate), // 4 печи
    ironFurnaces: (recipes.smeltIron.ticks * iron) / 3, // 3 печи
    outputInserter: swingCycle,
  };
}

describe('готовность M2: завод схем', () => {
  it('раскладка: все манипуляторы и сборщики в одной сети с генератором', () => {
    const { state, installedKw } = plant();
    const nets = powerNetworks(state);
    const netId = nets.buildingNet.get(buildingAt(state, 28, 10)!.id);
    expect(netId).toBeDefined();
    const electric = Object.values(state.buildings).filter((b) => (buildings as BuildingDefs)[b.type]?.energy?.kind === 'electric');
    expect(electric.filter((b) => b.type === 'inserter')).toHaveLength(17);
    expect(electric.filter((b) => b.type === 'assembler')).toHaveLength(2);
    for (const b of electric) expect(nets.buildingNet.get(b.id), `${b.type} (${b.x},${b.y})`).toBe(netId);
    expect(Object.values(state.buildings).filter((b) => b.type === 'furnace')).toHaveLength(7);
    // 17 манипуляторов по 13 кВт и 2 сборщика по 75 кВт; настоящий генератор (900) с запасом больше.
    expect(installedKw).toBe(17 * buildings.inserter.energy.kw + 2 * buildings.assembler.energy.kw);
    expect(buildings.generator.energy.kw).toBeGreaterThan(installedKw);
  });

  it('за 10 минут в сундук приходит не меньше расчётного числа схем', () => {
    const periods = stagePeriods();
    // Узкое место — манипулятор K → C: 3 провода × 31 тик = 93 тика на схему; остальные ступени быстрее
    // (сборщик схем 60, печи меди 67,5, печи железа 60, сборщик провода 45, выходной манипулятор 31).
    const period = Math.max(...Object.values(periods));
    expect(periods.cableInserter).toBe(period);
    expect(period).toBe(3 * (buildings.inserter.swingTicks + 1));
    const expected = Math.floor(TEN_MINUTES / period); // 36000 / 93 = 387
    // Запуск (первая пластина ~270 тиков, затем цепочка K → C ~200) отнимает ~1,5 % времени, но запас шире:
    // берём 90 % расчёта. Выше расчёта быть не может: быстрее узкого места цепочка не идёт.
    const run10 = full();
    expect(run10.circuits).toBeGreaterThanOrEqual(Math.floor(expected * 0.9));
    expect(run10.circuits).toBeLessThanOrEqual(expected);
    // Генератор (900 кВт) покрывает завод целиком: сеть удовлетворена всё время.
    expect(run10.minSatisfaction).toBe(POWER_SCALE);
  }, SLOW);

  it('при половине генерации схем заметно меньше, примерно вдвое', () => {
    const { state, installedKw } = plant();
    const halfKw = installedKw / 2;
    const half = run(state, withGenerator(halfKw), TEN_MINUTES);
    // Полная генерация покрывает спрос (всё время sat = 1), половинная — нет: спрос выше выработки.
    expect(full().maxDemand).toBeLessThanOrEqual(installedKw);
    expect(half.maxDemand).toBeGreaterThan(halfKw);
    expect(half.satisfiedShare).toBeLessThan(0.2);
    // Спрос не бывает выше установленной мощности = 2 × halfKw, поэтому sat не опускается ниже 1/2.
    expect(half.minSatisfaction).toBeGreaterThanOrEqual(POWER_SCALE / 2);
    // Допуск: каждое электрическое здание идёт на скорости sat ≥ 1/2, значит схем не меньше половины
    // (минус удлинённый запуск, берём 0,45). Верх: часть зданий в ожидании не входит в спрос, sat > 1/2
    // в среднем (на деле завод «просит» ~3/4 установленной мощности), поэтому ждём не больше 0,75 от полного выпуска.
    const ratio = half.circuits / full().circuits;
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.75);
  }, SLOW);
});
