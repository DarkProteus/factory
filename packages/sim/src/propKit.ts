// Вспомогательный набор для property-based тестов: генераторы команд, журнал модели и проверки инвариантов.
import { buildings as contentBuildings, INVENTORY_SLOTS, items, recipes } from '@factory/content';
import fc from 'fast-check';
import { footprintSize, type ItemStack, type PlacedBuilding } from './buildings';
import type { Command } from './commands';
import { cellIndex, type MapParams } from './grid';
import { createState, type SimState } from './state';
import { tick } from './tick';

export const MAP_SIZE = 12;

/** Шаг сценария: одна команда (в своём тике) или пачка пустых тиков. */
export type Step = { kind: 'cmd'; command: Command } | { kind: 'ticks'; count: number };

const buildingIds = Object.keys(contentBuildings);
// Немного за границей карты: такие команды должны игнорироваться.
const coord = fc.integer({ min: -1, max: MAP_SIZE });
const dir = fc.constantFrom(0, 1, 2, 3) as fc.Arbitrary<0 | 1 | 2 | 3>;

const buildCmd = fc.record({
  type: fc.constant('build' as const),
  building: fc.constantFrom(...buildingIds),
  x: coord,
  y: coord,
  dir,
});
const demolishCmd = fc.record({ type: fc.constant('demolish' as const), x: coord, y: coord });
// Снос в области готовой линии: чаще попадает в печь посреди цикла.
const demolishNearFactory = fc.record({
  type: fc.constant('demolish' as const),
  x: fc.integer({ min: 0, max: 5 }),
  y: fc.integer({ min: 0, max: 1 }),
});

export const stepArb: fc.Arbitrary<Step> = fc.oneof(
  { weight: 5, arbitrary: buildCmd.map((command): Step => ({ kind: 'cmd', command })) },
  { weight: 2, arbitrary: demolishCmd.map((command): Step => ({ kind: 'cmd', command })) },
  { weight: 2, arbitrary: demolishNearFactory.map((command): Step => ({ kind: 'cmd', command })) },
  { weight: 3, arbitrary: fc.integer({ min: 1, max: 400 }).map((count): Step => ({ kind: 'ticks', count })) },
);

/** Карта 12x12: залежь (0,0) всегда есть, остальные случайные (разные клетки, разные запасы). */
export const mapArb: fc.Arbitrary<MapParams> = fc
  .uniqueArray(
    fc.record({
      x: fc.integer({ min: 0, max: MAP_SIZE - 1 }),
      y: fc.integer({ min: 0, max: MAP_SIZE - 1 }),
      amount: fc.integer({ min: 1, max: 40 }),
    }),
    { selector: (d) => `${d.x},${d.y}`, minLength: 1, maxLength: 12 },
  )
  .map((deposits) => ({
    width: MAP_SIZE,
    height: MAP_SIZE,
    deposits: [
      { x: 0, y: 0, item: 'ironOre', amount: 30 },
      ...deposits.filter((d) => d.x + d.y > 0).map((d) => ({ ...d, item: 'ironOre' })),
    ],
  }));

/** Готовая линия бур -> печь -> манипулятор -> сундук на залежи (0,0): цепочка точно работает. */
export const FACTORY_PREFIX: Step[] = [
  { kind: 'cmd', command: { type: 'build', building: 'drill', x: 0, y: 0, dir: 1 } },
  { kind: 'cmd', command: { type: 'build', building: 'furnace', x: 2, y: 0, dir: 1 } },
  { kind: 'cmd', command: { type: 'build', building: 'inserter', x: 4, y: 0, dir: 1 } },
  { kind: 'cmd', command: { type: 'build', building: 'chest', x: 5, y: 0, dir: 1 } },
];

/** Журнал модели: то, что состояние само не помнит, но нужно для баланса предметов. */
export interface Ledger {
  /** Сумма исходных запасов залежей по предметам. */
  initial: Record<string, number>;
  /** Ценность предметов, лежавших в инвентаре с самого начала (не из залежей). */
  startingHeld: number;
}

/** `fullInventory` — забить инвентарь почти целиком патронами, чтобы снос иногда упирался в нехватку места. */
export function newWorld(seed: number, map: MapParams, fullInventory = false): { state: SimState; ledger: Ledger } {
  const initial: Record<string, number> = {};
  for (const d of map.deposits ?? []) initial[d.item] = (initial[d.item] ?? 0) + d.amount;
  const state = createState(seed, map);
  if (fullInventory) {
    for (let i = 0; i < INVENTORY_SLOTS - 1; i++) state.inventory.push({ item: 'ammo', count: items.ammo.stack });
  }
  const startingHeld = state.inventory.reduce((a, s) => a + s.count * oreValue(s.item), 0);
  return { state, ledger: { initial, startingHeld } };
}

const stacksOf = (b: PlacedBuilding): ItemStack[] => [
  ...(b.belt ?? []).map((it) => ({ item: it.item, count: 1 })),
  ...(b.output ? [b.output] : []),
  ...(b.input ?? []),
  ...(b.slots ?? []),
];

/** Ингредиенты цикла, который здание выполняет сейчас (со входа они уже списаны). */
function inFlight(b: PlacedBuilding): number {
  const recipe = b.recipe === undefined ? undefined : recipes[b.recipe as keyof typeof recipes];
  return recipe && b.progress > 0 ? Object.values(recipe.in).reduce((a, n) => a + n, 0) : 0;
}

function cellOwner(state: SimState, x: number, y: number): PlacedBuilding | undefined {
  const { map } = state;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return state.buildings[map.occupancy[cellIndex(map, x, y)]!];
}

/** Применяет шаг, ведя журнал. Возвращает true, если снос состоялся. */
export function applyStep(state: SimState, ledger: Ledger, step: Step): boolean {
  if (step.kind === 'ticks') {
    for (let i = 0; i < step.count; i++) tick(state, []);
    return false;
  }
  const c = step.command;
  const target = c.type === 'demolish' ? cellOwner(state, c.x, c.y) : undefined;
  tick(state, [c]);
  return target !== undefined && state.buildings[target.id] === undefined;
}

/** Занятость карты согласована со зданиями: ни пересечений, ни «висящих» клеток. */
export function checkOccupancy(state: SimState): void {
  const { map } = state;
  let claimed = 0;
  const seen = new Set<number>();
  for (const [key, b] of Object.entries(state.buildings)) {
    if (b.id !== Number(key) || b.id >= state.nextId) throw new Error(`Неверный id здания ${key}`);
    const [w, h] = footprintSize(contentBuildings[b.type as keyof typeof contentBuildings].size, b.dir);
    if (b.x < 0 || b.y < 0 || b.x + w > map.width || b.y + h > map.height) throw new Error(`Здание ${b.id} вне карты`);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const i = cellIndex(map, b.x + dx, b.y + dy);
        if (seen.has(i)) throw new Error(`Клетка ${i} в двух отпечатках`);
        seen.add(i);
        if (map.occupancy[i] !== b.id) throw new Error(`Клетка ${i} здания ${b.id} занята ${map.occupancy[i]}`);
        claimed += 1;
      }
    }
  }
  const occupied = map.occupancy.filter((id) => id !== 0).length;
  if (occupied !== claimed) throw new Error(`Занято клеток ${occupied}, в отпечатках ${claimed}`);
}

/** Ценность предмета в «руде»: пластина стоит столько руды, сколько уходит на неё по рецепту. */
function oreValue(item: string): number {
  for (const r of Object.values(recipes)) {
    const out = (r.out as Record<string, number>)[item];
    if (out) return Object.values(r.in).reduce((a, n) => a + n, 0) / out;
  }
  return 1;
}

/** Инвентарь игрока: не длиннее лимита, стеки непустые и в пределах stack. */
export function checkInventory(state: SimState): void {
  if (state.inventory.length > INVENTORY_SLOTS) throw new Error('Инвентарь длиннее лимита');
  for (const s of state.inventory) {
    if (s.count < 1 || s.count > items[s.item as keyof typeof items].stack) throw new Error(`Неверный стек ${s.item}×${s.count}`);
  }
}

/**
 * Сохранение предметов: добытая руда (исходные запасы минус остаток) равна ценности всего,
 * что лежит в зданиях и инвентаре, плюс цикл крафта в работе. Снос ничего не теряет (TASK-22).
 */
export function checkConservation(state: SimState, ledger: Ledger): void {
  const remaining: Record<string, number> = {};
  for (const d of state.map.deposits) if (d) remaining[d.item] = (remaining[d.item] ?? 0) + d.amount;
  let mined = 0;
  for (const [item, total] of Object.entries(ledger.initial)) mined += (total - (remaining[item] ?? 0)) * oreValue(item);
  let held = -ledger.startingHeld;
  const count = (s: ItemStack): void => void (held += s.count * oreValue(s.item));
  state.inventory.forEach(count);
  for (const b of Object.values(state.buildings)) {
    stacksOf(b).forEach(count);
    held += inFlight(b);
  }
  if (Math.abs(mined - held) > 1e-9) throw new Error(`Баланс предметов: добыто ${mined}, учтено ${held}`);
}
