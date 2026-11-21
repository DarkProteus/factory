// Готовые связки для случайных тестов: данные (команды build от точки привязки и что подать на вход),
// поворот, генератор мира из связок и шаги сноса/достройки по клеткам связок.
import { buildings as contentBuildings, items, type BuildingDef } from '@factory/content';
import fc from 'fast-check';
import { buildingAt, type Dir } from './buildings';
import type { MapParams } from './grid';
import { newWorld, oreValue, stacksOf, UNTRACKED, type Ledger, type Step } from './propKit';
import type { SimState } from './state';
import { tick } from './tick';

/** Карта для миров из связок: на 12x12 три связки не помещаются. */
export const BUNDLE_MAP = 28;
/** Запас руды в каждой клетке под буром. */
const DEPOSIT_EACH = 12;

/** Здание связки: клетка левого верхнего угла относительно точки привязки (поворот 0 — «на восток»). */
export type BundlePart = readonly [building: string, x: number, y: number, dir: Dir];

/** Связка — данные: что построить, что положить в сундуки, какой рецепт и какие клетки считать выходом. */
export interface Bundle {
  name: string;
  parts: readonly BundlePart[];
  /** Предмет кладётся в ячейки здания в клетке (x, y): сундук-источник. */
  feeds?: readonly (readonly [x: number, y: number, item: string, count: number])[];
  recipes?: readonly (readonly [x: number, y: number, recipe: string])[];
  /** Активная технология: нужна лаборатории. */
  research?: string;
  /** Клетки зданий, куда предметы должны дойти: по ним проверяют, что связка работает. */
  sinks: readonly (readonly [x: number, y: number])[];
}

// Электричество: генератор с углём (топливо кладёт мир) и столбы, покрывающие манипуляторы.
export const BUNDLES: readonly Bundle[] = [
  {
    name: 'бур → печь → манипулятор → сундук',
    parts: [
      ['drill', 0, 0, 1], ['furnace', 2, 0, 1], ['inserter', 4, 0, 1], ['chest', 5, 0, 1],
      ['pole', 2, 2, 0], ['generator', 0, 3, 1],
    ],
    sinks: [[5, 0]],
  },
  {
    name: 'лента → разделитель → манипуляторы → сундуки',
    parts: [
      ['chest', 0, 3, 1], ['inserter', 1, 3, 1], ['belt', 2, 3, 1], ['splitter', 3, 3, 1], ['belt', 4, 3, 1],
      ['inserter', 5, 3, 1], ['chest', 6, 3, 1], ['belt', 3, 2, 0], ['inserter', 3, 1, 0], ['chest', 3, 0, 1],
      ['pole', 2, 2, 0], ['pole', 4, 2, 0], ['generator', 1, 4, 1],
    ],
    feeds: [[0, 3, 'ironPlate', 30]],
    sinks: [[6, 3], [3, 0]],
  },
  {
    name: 'сборщик с подачей и выдачей',
    parts: [
      ['chest', 0, 1, 1], ['inserter', 1, 1, 1], ['assembler', 2, 0, 1], ['inserter', 5, 1, 1], ['chest', 6, 1, 1],
      ['pole', 3, 3, 0], ['generator', 0, 3, 1],
    ],
    feeds: [[0, 1, 'ironPlate', 30]],
    recipes: [[2, 0, 'ironGear']],
    sinks: [[6, 1]],
  },
  {
    name: 'генератор и цепочка столбов',
    parts: [
      ['generator', 0, 0, 1], ['pole', 3, 1, 0], ['pole', 8, 1, 0], ['chest', 7, 3, 1], ['inserter', 8, 3, 1], ['chest', 9, 3, 1],
    ],
    feeds: [[7, 3, 'ironPlate', 30]],
    sinks: [[9, 3]],
  },
  {
    name: 'лаборатория с пакетами',
    parts: [
      ['chest', 0, 1, 1], ['inserter', 1, 1, 1], ['lab', 2, 0, 1], ['pole', 1, 3, 0], ['generator', 3, 3, 1],
    ],
    feeds: [[0, 1, 'sciencePackRed', 20]],
    research: 'logistics',
    sinks: [[2, 0]],
  },
  {
    name: 'подземный конвейер',
    parts: [
      ['chest', 0, 1, 1], ['inserter', 1, 1, 1], ['belt', 2, 1, 1], ['undergroundBelt', 3, 1, 1], ['undergroundBelt', 7, 1, 1],
      ['belt', 8, 1, 1], ['inserter', 9, 1, 1], ['chest', 10, 1, 1],
      ['pole', 1, 3, 0], ['pole', 5, 3, 0], ['pole', 9, 3, 0], ['generator', 2, 4, 1],
    ],
    feeds: [[0, 1, 'ironPlate', 30]],
    sinks: [[10, 1]],
  },
];

const sizeOf = (building: string): number => contentBuildings[building as keyof typeof contentBuildings].size[0];

/** Размер связки по габаритам зданий (все здания квадратные). */
export function bundleSize(b: Bundle): [number, number] {
  return [Math.max(...b.parts.map(([id, x]) => x + sizeOf(id))), Math.max(...b.parts.map(([id, , y]) => y + sizeOf(id)))];
}

/** Куда поставить связку: номер, число поворотов на 90° по часовой, левый верхний угол габарита. */
export interface Placement {
  bundle: number;
  rot: number;
  x: number;
  y: number;
}

/** Точка (x, y) квадрата `size` внутри габарита w×h после поворота на 90° по часовой; габарит становится h×w. */
const turn = (x: number, y: number, size: number, h: number): [number, number] => [h - y - size, x];

/** Связка на карте: те же данные в абсолютных клетках. */
export interface Resolved {
  parts: BundlePart[];
  feeds: [number, number, string, number][];
  recipes: [number, number, string][];
  research?: string;
  sinks: [number, number][];
  /** Клетки под бурами: там нужна руда. */
  ore: [number, number][];
}

export function resolve(p: Placement): Resolved {
  const bundle = BUNDLES[p.bundle]!;
  const place = (x: number, y: number, size: number): [number, number] => {
    let [cx, cy] = [x, y];
    let [w, h] = bundleSize(bundle);
    for (let i = 0; i < p.rot; i++) {
      [cx, cy] = turn(cx, cy, size, h);
      [w, h] = [h, w];
    }
    return [p.x + cx, p.y + cy];
  };
  const parts = bundle.parts.map(([id, x, y, dir]): BundlePart => [id, ...place(x, y, sizeOf(id)), ((dir + p.rot) % 4) as Dir]);
  const ore: [number, number][] = [];
  for (const [id, x, y] of parts) {
    if (id !== 'drill') continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ore.push([x + dx, y + dy]);
  }
  return {
    parts,
    feeds: (bundle.feeds ?? []).map(([x, y, item, n]) => [...place(x, y, 1), item, n]),
    recipes: (bundle.recipes ?? []).map(([x, y, recipe]) => [...place(x, y, 3), recipe]),
    research: bundle.research,
    sinks: bundle.sinks.map(([x, y]) => place(x, y, 1)),
    ore,
  };
}

/** Клетки, занятые зданиями связки (весь отпечаток). */
export function cellsOf(r: Resolved): string[] {
  return r.parts.flatMap(([id, x, y]) => {
    const s = sizeOf(id);
    return Array.from({ length: s * s }, (_, i) => `${x + (i % s)},${y + Math.floor(i / s)}`);
  });
}

const rotArb = fc.integer({ min: 0, max: 3 });
const placementArb: fc.Arbitrary<Placement> = fc
  .tuple(fc.integer({ min: 0, max: BUNDLES.length - 1 }), rotArb)
  .chain(([bundle, rot]) => {
    const [w, h] = bundleSize(BUNDLES[bundle]!);
    const [rw, rh] = rot % 2 === 0 ? [w, h] : [h, w];
    return fc.record({
      bundle: fc.constant(bundle),
      rot: fc.constant(rot),
      x: fc.integer({ min: 0, max: BUNDLE_MAP - rw }),
      y: fc.integer({ min: 0, max: BUNDLE_MAP - rh }),
    });
  });

const noOverlap = (list: Placement[]): boolean => {
  const seen = new Set<string>();
  for (const cell of list.flatMap((p) => cellsOf(resolve(p)))) {
    if (seen.has(cell)) return false;
    seen.add(cell);
  }
  return true;
};

/** Набор из 1–3 связок со случайными местами и поворотами; пересекающиеся наборы отбрасываются. */
export const placementsArb: fc.Arbitrary<Placement[]> = fc.array(placementArb, { minLength: 1, maxLength: 3 }).filter(noOverlap);

/** Несколько случайных залежей вокруг: связки с бурами кладут руду сами, остальное — шум. */
const noiseArb = fc.uniqueArray(
  fc.record({
    x: fc.integer({ min: 0, max: BUNDLE_MAP - 1 }),
    y: fc.integer({ min: 0, max: BUNDLE_MAP - 1 }),
    amount: fc.integer({ min: 1, max: 20 }),
  }),
  { selector: (d) => `${d.x},${d.y}`, maxLength: 6 },
);

/** Первый шаг каждого сценария: связки успевают заработать до случайного сноса и достройки. */
export const WARM_UP: Step = { kind: 'ticks', count: 500 };

export interface BundleScenario {
  seed: number;
  placements: Placement[];
  noise: { x: number; y: number; amount: number }[];
  steps: Step[];
}

/** Шаги над миром связок: снос и достройка клеток связок чаще, чем случайные места, плюс тики. */
export function bundleStepArb(placements: readonly Placement[]): fc.Arbitrary<Step> {
  const parts = placements.flatMap((p) => resolve(p).parts);
  const part = fc.constantFrom(...parts);
  const cmd = (command: Step & { kind: 'cmd' }): Step => command;
  const any = fc.integer({ min: -1, max: BUNDLE_MAP });
  return fc.oneof(
    { weight: 4, arbitrary: part.map(([, x, y]) => cmd({ kind: 'cmd', command: { type: 'demolish', x, y } })) },
    { weight: 4, arbitrary: part.map(([building, x, y, dir]) => cmd({ kind: 'cmd', command: { type: 'build', building, x, y, dir } })) },
    {
      weight: 2,
      arbitrary: fc.record({ building: fc.constantFrom(...Object.keys(contentBuildings)), x: any, y: any, dir: fc.constantFrom<Dir>(0, 1, 2, 3) })
        .map((c) => cmd({ kind: 'cmd', command: { type: 'build', ...c } })),
    },
    { weight: 1, arbitrary: fc.record({ x: any, y: any }).map((c) => cmd({ kind: 'cmd', command: { type: 'demolish', ...c } })) },
    { weight: 5, arbitrary: fc.integer({ min: 1, max: 300 }).map((count): Step => ({ kind: 'ticks', count })) },
  );
}

export const bundleScenarioArb: fc.Arbitrary<BundleScenario> = fc
  .record({ seed: fc.integer(), placements: placementsArb, noise: noiseArb })
  .chain((s) => fc.array(bundleStepArb(s.placements), { maxLength: 30 }).map((steps) => ({ ...s, steps: [WARM_UP, ...steps] })));

/** Мир с расставленными связками: здания построены, источники заряжены, печи и генераторы с углём. */
export function bundleWorld(
  seed: number,
  placements: readonly Placement[],
  noise: BundleScenario['noise'],
  fullInventory = false,
): { state: SimState; ledger: Ledger; resolved: Resolved[] } {
  const resolved = placements.map(resolve);
  const oreCells = new Set(resolved.flatMap((r) => r.ore.map(([x, y]) => `${x},${y}`)));
  const deposits = [
    ...noise.filter((d) => !oreCells.has(`${d.x},${d.y}`)).map((d) => ({ ...d, item: 'ironOre' })),
    ...[...oreCells].map((c) => ({ x: Number(c.split(',')[0]), y: Number(c.split(',')[1]), item: 'ironOre', amount: DEPOSIT_EACH })),
  ];
  const map: MapParams = { width: BUNDLE_MAP, height: BUNDLE_MAP, deposits };
  const { state, ledger } = newWorld(seed, map, fullInventory);
  const all = resolved.flatMap((r) => r.parts);
  // Здания связок: к базовым шести предметам каждого вида добавляем, чтобы хватило на все связки и достройку.
  for (const [building] of all) {
    const slot = state.inventory.find((s) => s.item === building);
    if (slot) slot.count += 1;
    else state.inventory.push({ item: building, count: 1 });
    ledger.startingHeld += oreValue(building);
  }
  tick(state, all.map(([building, x, y, dir]) => ({ type: 'build', building, x, y, dir })));
  for (const [building, x, y] of all) {
    const b = buildingAt(state, x, y);
    if (b && (contentBuildings as Record<string, BuildingDef>)[building]?.fuelSlot) b.fuel = { item: 'coal', count: items.coal.stack };
  }
  for (const r of resolved) {
    for (const [x, y, item, count] of r.feeds) {
      const b = buildingAt(state, x, y);
      if (!b) continue;
      b.slots = [{ item, count }];
      if (!UNTRACKED.includes(item)) ledger.startingHeld += count * oreValue(item);
    }
    for (const [x, y, recipe] of r.recipes) tick(state, [{ type: 'setRecipe', building: buildingAt(state, x, y)!.id, recipe }]);
    if (r.research) tick(state, [{ type: 'setResearch', tech: r.research }]);
  }
  return { state, ledger, resolved };
}

/** Сколько предметов лежит в зданиях-выходах связок (лаборатория — ещё и в идущей единице). */
export function sinkLevel(state: SimState, resolved: readonly Resolved[]): number {
  let total = 0;
  for (const r of resolved) {
    for (const [x, y] of r.sinks) {
      const b = buildingAt(state, x, y);
      if (b) total += stacksOf(b).reduce((a, s) => a + s.count, 0) + (b.unit ? 1 : 0);
    }
  }
  return total;
}
