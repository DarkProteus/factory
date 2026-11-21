// Логика окна здания без DOM: можно ли открыть окно, статус, прогресс, энергия,
// какие ячейки показывать и какие команды слать по клику. Состояние sim только читается.
import {
  buildings as contentBuildings,
  INVENTORY_SLOTS,
  items as contentItems,
  recipes as contentRecipes,
  technologies,
  type BuildingDef,
  type RecipeDef,
} from '@factory/content';
import {
  addAll,
  buildingAt,
  canAccept,
  contents,
  depositAt,
  footprintSize,
  POWER_SCALE,
  powerNetworks,
  powerStats,
  type BuildingSlot,
  type Command,
  type ItemStack,
  type PlacedBuilding,
  type SimState,
} from '@factory/sim';
import { applyUiKey } from './craftUi';
import type { Cell, Tool } from './input';

type Defs = Readonly<Record<string, BuildingDef>>;
type Recipes = Readonly<Record<string, RecipeDef>>;

/** Окно есть у бура, печи, сборщика, сундука, генератора и фильтрующего разделителя: по виду поведения. */
export function hasBuildingWindow(def: BuildingDef | undefined): boolean {
  return !!def && ['miner', 'crafter', 'container', 'generator', 'filterSplitter', 'lab'].includes(def.behavior);
}

/** Здание, чьё окно открывает клик по клетке: только без инструмента и только у зданий с окном. */
export function windowTarget(state: SimState, tool: Tool, cell: Cell, defs: Defs = contentBuildings): number | null {
  if (tool.kind !== 'none') return null;
  const b = buildingAt(state, cell.x, cell.y);
  return b && hasBuildingWindow(defs[b.type]) ? b.id : null;
}

/** Открытые окна: инвентарь и окно здания взаимоисключающие. */
export interface Windows {
  inventory: boolean;
  /** id здания с открытым окном или null. */
  building: number | null;
}

/** E и Esc закрывают любое открытое окно; без окна E открывает инвентарь. */
export function applyWindowKey(w: Windows, code: string): Windows {
  if (w.building !== null) return code === 'KeyE' || code === 'Escape' ? { inventory: false, building: null } : w;
  const inventory = applyUiKey(w.inventory, code);
  return inventory === w.inventory ? w : { inventory, building: null };
}

/** Энергия здания по данным последнего тика: удовлетворённость сети (undefined — вне сети) и спрос сети, кВт. */
export function buildingPower(state: SimState, id: number): { satisfaction: number | undefined; demand: number } {
  const stats = powerStats(state);
  const net = powerNetworks(state).buildingNet.get(id);
  return { satisfaction: stats.byBuilding.get(id), demand: net === undefined ? 0 : (stats.networks.get(net)?.demand ?? 0) };
}

export type Lamp = 'work' | 'wait' | 'off';

export interface BuildingStatus {
  label: string;
  lamp: Lamp;
}

const WORK: BuildingStatus = { label: 'Работает', lamp: 'work' };
const NO_INPUT: BuildingStatus = { label: 'Ждёт: нет входа', lamp: 'wait' };
const OUTPUT_FULL: BuildingStatus = { label: 'Ждёт: выход полон', lamp: 'wait' };
const NO_POWER: BuildingStatus = { label: 'Нет энергии', lamp: 'off' };
const NO_FUEL: BuildingStatus = { label: 'Нет топлива', lamp: 'off' };

/** Топлива нет совсем: ячейка пуста и остатка сожжённого не хватает на тик (cost, Вт·тик). */
const outOfFuel = (b: PlacedBuilding, cost = 1): boolean => !b.fuel && (b.burn ?? 0) < cost;

/** Есть ли под отпечатком бура залежь. */
function hasDeposit(state: SimState, b: PlacedBuilding, def: BuildingDef): boolean {
  const [w, h] = footprintSize(def.size, b.dir);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) if (depositAt(state, b.x + dx, b.y + dy)) return true;
  }
  return false;
}

/** Хватает ли входа на запуск цикла и есть ли место под результат. */
function crafterBlock(b: PlacedBuilding, def: BuildingDef, recipe: RecipeDef): BuildingStatus | null {
  const have = (item: string) => b.input?.find((s) => s.item === item)?.count ?? 0;
  if (!Object.entries(recipe.in).every(([item, n]) => have(item) >= n)) return NO_INPUT;
  const [out, n] = Object.entries(recipe.out)[0]!;
  const room = b.output ? b.output.item === out && b.output.count + n <= (def.buffer ?? 0) : n <= (def.buffer ?? 0);
  return room ? null : OUTPUT_FULL;
}

/**
 * Статус здания для окна; null у сундука. satisfaction — удовлетворённость сети (0..POWER_SCALE),
 * undefined — здание вне сети. Порядок проверок совпадает с лампами на карте (см. docs/style.md).
 */
export function buildingStatus(
  state: SimState,
  b: PlacedBuilding,
  satisfaction: number | undefined,
  demand = 0,
  defs: Defs = contentBuildings,
  recipes: Recipes = contentRecipes,
): BuildingStatus | null {
  const def = defs[b.type];
  if (!def) return null;
  const unpowered = def.energy?.kind === 'electric' && !satisfaction;
  switch (def.behavior) {
    case 'miner':
      if (!hasDeposit(state, b, def)) return { label: 'Нет залежи', lamp: 'off' };
      if ((b.output?.count ?? 0) >= (def.buffer ?? 0)) return OUTPUT_FULL;
      return unpowered ? NO_POWER : WORK;
    case 'crafter': {
      if (def.fuelSlot && outOfFuel(b, (def.energy?.kw ?? 0) * 1000)) return NO_FUEL;
      const recipe = b.recipe === undefined ? undefined : recipes[b.recipe];
      if (!recipe) return def.recipeMode === 'chosen' ? { label: 'Рецепт не выбран', lamp: 'off' } : { ...NO_INPUT, lamp: 'off' };
      if (unpowered) return NO_POWER;
      return b.progress > 0 ? WORK : (crafterBlock(b, def, recipe) ?? WORK);
    }
    case 'lab': {
      const active = state.research.active;
      if (active === null) return { label: 'Нет исследования', lamp: 'off' };
      const hasPacks = Object.entries(technologies[active].unit).every(([item, n]) => (b.input?.find((s) => s.item === item)?.count ?? 0) >= n);
      if (b.unit === undefined && !hasPacks) return { label: 'Ждёт: нет пакетов', lamp: 'wait' };
      return unpowered ? NO_POWER : { label: 'Исследует', lamp: 'work' };
    }
    case 'generator':
      if (outOfFuel(b)) return NO_FUEL;
      return demand > 0 ? WORK : { label: 'Нет нагрузки', lamp: 'wait' };
    default:
      return null;
  }
}

/** Доля выполненного цикла 0..1; null — полосы прогресса нет (сундук, генератор). */
export function buildingProgress(b: PlacedBuilding, defs: Defs = contentBuildings, recipes: Recipes = contentRecipes): number | null {
  const def = defs[b.type];
  if (def?.behavior === 'miner') return Math.min(1, b.progress / (def.miningTicks || 1));
  if (def?.behavior === 'lab') {
    const ticks = b.unit === undefined ? 0 : (technologies[b.unit as keyof typeof technologies]?.unitTicks ?? 0);
    return ticks > 0 ? Math.min(1, b.progress / ticks) : 0;
  }
  if (def?.behavior !== 'crafter') return null;
  const ticks = b.recipe === undefined ? 0 : (recipes[b.recipe]?.ticks ?? 0);
  return ticks > 0 ? Math.min(1, b.progress / ticks) : 0;
}

export interface EnergyLine {
  /** «75 кВт · 100 %» или «НЕТ СЕТИ». */
  text: string;
  bad: boolean;
}

/** Строка энергии бура и сборщика; null у зданий без сети. */
export function energyLine(def: BuildingDef, satisfaction: number | undefined): EnergyLine | null {
  if (def.energy?.kind !== 'electric') return null;
  if (satisfaction === undefined) return { text: 'НЕТ СЕТИ', bad: true };
  return { text: `${def.energy.kw} кВт · ${Math.floor((satisfaction * 100) / POWER_SCALE)} %`, bad: satisfaction < POWER_SCALE };
}

/** Ячейка здания для показа: адрес для takeFromBuilding (null — брать нечего) и стек. */
export interface BuildingCell {
  slot: BuildingSlot | null;
  stack: ItemStack | null;
  /** Предмет, который ждёт пустая ячейка входа (для подсказки). */
  wants?: string;
}

export interface Section {
  /** Подзаголовок: «Вход», «Топливо», «Выход»; у сундука пусто. */
  title: string;
  cells: BuildingCell[];
}

const stackOrNull = (s: ItemStack | null | undefined): ItemStack | null => (s && s.count > 0 ? s : null);

/** Секции ячеек окна: вход, топливо, выход; у сундука — одна сетка его ячеек. */
export function buildingSections(b: PlacedBuilding, defs: Defs = contentBuildings): Section[] {
  const def = defs[b.type];
  if (!def) return [];
  if (def.behavior === 'container') {
    const cells = Array.from({ length: def.slots ?? 0 }, (_, index): BuildingCell => {
      const stack = b.slots?.[index] ?? null;
      return { slot: stack ? { kind: 'slot', index } : null, stack };
    });
    return [{ title: '', cells }];
  }
  if (def.behavior === 'lab') {
    // Ячейка на каждый вид пакета, пустые тоже видны (стек пакета лежит в b.input).
    const packs = [...new Set(Object.values(technologies).flatMap((t) => Object.keys(t.unit)))];
    const cells = packs.map((item): BuildingCell => {
      const index = (b.input ?? []).findIndex((s) => s.item === item);
      const stack = stackOrNull(b.input?.[index]);
      return { slot: stack ? { kind: 'input', index } : null, stack, wants: item };
    });
    return [{ title: 'ПАКЕТЫ', cells }];
  }
  const sections: Section[] = [];
  if (def.behavior === 'crafter') {
    const input = b.input ?? [];
    // Сборщик показывает ячейку на каждый ингредиент, печь — только стек руды, если он есть.
    const shown = def.recipeMode === 'chosen' ? input.map((s, index) => ({ s, index })) : input.map((s, index) => ({ s, index })).filter(({ s }) => s.count > 0);
    const cells = shown.map(({ s, index }): BuildingCell => {
      const stack = stackOrNull(s);
      return { slot: stack ? { kind: 'input', index } : null, stack, wants: s.item };
    });
    sections.push({ title: 'Вход', cells: cells.length ? cells : [{ slot: null, stack: null }] });
  }
  if (def.fuelSlot) sections.push({ title: 'Топливо', cells: [{ slot: b.fuel ? { kind: 'fuel' } : null, stack: b.fuel ?? null }] });
  if (def.behavior === 'miner' || def.behavior === 'crafter') {
    sections.push({ title: 'Выход', cells: [{ slot: b.output ? { kind: 'output' } : null, stack: b.output }] });
  }
  return sections;
}

/** Клик по ячейке здания: забрать её в инвентарь; пустая ячейка команды не даёт. */
export function takeCommand(b: PlacedBuilding, cell: BuildingCell): Command | null {
  return cell.slot ? { type: 'takeFromBuilding', building: b.id, slot: cell.slot } : null;
}

/** Клик по ячейке инвентаря: положить в здание всю стопку; если здание предмет не примет — null. */
export function putCommand(b: PlacedBuilding, stack: ItemStack | null, defs: Defs = contentBuildings, active?: string | null): Command | null {
  if (!stack || !acceptsItem(b, stack.item, defs, active)) return null;
  return { type: 'putIntoBuilding', building: b.id, item: stack.item, count: stack.count };
}

/** Примет ли здание предмет сейчас (для подсветки «не примет»). */
export const acceptsItem = (b: PlacedBuilding, item: string, defs: Defs = contentBuildings, active?: string | null): boolean =>
  canAccept(b, item, defs, undefined, active);

/** Поместится ли всё содержимое здания в инвентарь: иначе смена рецепта запрещена. */
export function fitsInInventory(inventory: readonly ItemStack[], b: PlacedBuilding, slotCount = INVENTORY_SLOTS): boolean {
  const trial = inventory.map((s) => ({ ...s }));
  return addAll(trial, slotCount, contents(b));
}

export interface RecipeChoice {
  id: string;
  def: RecipeDef;
  selected: boolean;
  /** false — смена на этот рецепт сейчас невозможна (нет места в инвентаре). */
  available: boolean;
}

/** Рецепты сборщика (madeIn этого здания) с отметкой выбранного и доступности. */
export function recipeChoices(inventory: readonly ItemStack[], b: PlacedBuilding, recipes: Recipes = contentRecipes): RecipeChoice[] {
  const fits = fitsInInventory(inventory, b);
  return Object.entries(recipes)
    .filter(([, def]) => def.madeIn === b.type)
    .map(([id, def]) => ({ id, def, selected: b.recipe === id, available: b.recipe === id || fits }));
}

/** Клик по рецепту: setRecipe; выбранный и недоступный рецепты команды не дают. */
export function recipeCommand(b: PlacedBuilding, choice: RecipeChoice): Command | null {
  return choice.selected || !choice.available ? null : { type: 'setRecipe', building: b.id, recipe: choice.id };
}

export interface FilterChoice {
  /** Предмет-фильтр; null — «без фильтра». */
  item: string | null;
  selected: boolean;
}

/** Кнопки фильтра фильтрующего разделителя: «без фильтра» и все предметы; у других зданий пусто. */
export function filterChoices(b: PlacedBuilding, defs: Defs = contentBuildings): FilterChoice[] {
  if (defs[b.type]?.behavior !== 'filterSplitter') return [];
  const current = b.filter ?? null;
  return [null, ...Object.keys(contentItems)].map((item) => ({ item, selected: item === current }));
}

/** Клик по кнопке фильтра: setFilter; уже выбранный вариант команды не даёт. */
export function filterCommand(b: PlacedBuilding, item: string | null): Command | null {
  return (b.filter ?? null) === item ? null : { type: 'setFilter', building: b.id, item };
}
