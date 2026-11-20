import { buildings as contentBuildings, INVENTORY_SLOTS, recipes as contentRecipes, type BuildingDef, type RecipeDef } from '@factory/content';
import type { BeltItem } from './belt';
import { cellIndex, inBounds, type GameMap } from './grid';
import { add } from './inventory';

/** Направление: 0 — N, 1 — E, 2 — S, 3 — W. */
export type Dir = 0 | 1 | 2 | 3;

export interface PlacedBuilding {
  id: number;
  /** id из content.buildings. */
  type: string;
  /** Левая верхняя клетка отпечатка. */
  x: number;
  y: number;
  dir: Dir;
  /** Накопленные тики текущего рабочего цикла. */
  progress: number;
  /** Выходной буфер: один вид предмета или пусто. */
  output: ItemStack | null;
  /** Предметы на конвейере (только у поведения belt), см. belt.ts. */
  belt?: BeltItem[];
  /** Вход крафтера: по стеку на ингредиент рецепта. */
  input?: ItemStack[];
  /** Текущий рецепт крафтера (id из content.recipes). */
  recipe?: string;
  /** Ячейки контейнера: только непустые стеки. */
  slots?: ItemStack[];
}

/** Стопка одного предмета. */
export interface ItemStack {
  /** id из content.items. */
  item: string;
  count: number;
}

/** Таблица определений зданий; по умолчанию берётся из content. */
export type BuildingDefs = Readonly<Record<string, BuildingDef>>;

interface BuildingsState {
  map: GameMap;
  buildings: Record<number, PlacedBuilding>;
  nextId: number;
  inventory: ItemStack[];
}

/** Ширина и высота отпечатка: при E и W размеры меняются местами. */
export function footprintSize(size: readonly [number, number], dir: Dir): [number, number] {
  return dir === 1 || dir === 3 ? [size[1], size[0]] : [size[0], size[1]];
}

const isDir = (dir: unknown): dir is Dir => dir === 0 || dir === 1 || dir === 2 || dir === 3;

/** Здание, занимающее клетку, или null. */
export function buildingAt(state: BuildingsState, x: number, y: number): PlacedBuilding | null {
  if (!inBounds(state.map, x, y)) return null;
  const id = state.map.occupancy[cellIndex(state.map, x, y)];
  return id ? (state.buildings[id] ?? null) : null;
}

function setOccupancy(map: GameMap, b: PlacedBuilding, size: readonly [number, number], value: number): void {
  const [w, h] = footprintSize(size, b.dir);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) map.occupancy[cellIndex(map, b.x + dx, b.y + dy)] = value;
  }
}

/** Можно ли поставить здание: известный тип, верное направление, отпечаток целиком на карте и свободен. */
export function canPlace(
  state: BuildingsState,
  type: string,
  x: number,
  y: number,
  dir: number,
  defs: BuildingDefs = contentBuildings,
): boolean {
  if (!Object.hasOwn(defs, type) || !isDir(dir) || !inBounds(state.map, x, y)) return false;
  const [w, h] = footprintSize(defs[type]!.size, dir);
  if (!inBounds(state.map, x + w - 1, y + h - 1)) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (state.map.occupancy[cellIndex(state.map, x + dx, y + dy)] !== 0) return false;
    }
  }
  return true;
}

/** Ставит здание; неверную команду (занято, вне карты, неизвестный тип) молча игнорирует. */
export function placeBuilding(
  state: BuildingsState,
  type: string,
  x: number,
  y: number,
  dir: number,
  defs: BuildingDefs = contentBuildings,
): void {
  if (!isDir(dir) || !canPlace(state, type, x, y, dir, defs)) return;
  const size = defs[type]!.size;
  const building: PlacedBuilding = { id: state.nextId, type, x, y, dir, progress: 0, output: null };
  state.nextId += 1;
  state.buildings[building.id] = building;
  setOccupancy(state.map, building, size, building.id);
}

/**
 * Всё, что лежит в здании: конвейер, выход, вход крафтера, ячейки контейнера
 * и ингредиенты идущего цикла крафта (они списаны со входа на старте цикла).
 */
function contents(b: PlacedBuilding): ItemStack[] {
  const stacks: ItemStack[] = [];
  const table: Readonly<Record<string, RecipeDef>> = contentRecipes;
  const recipe = b.recipe === undefined ? undefined : table[b.recipe];
  if (recipe && b.progress > 0) {
    for (const [item, count] of Object.entries(recipe.in)) stacks.push({ item, count });
  }
  for (const it of b.belt ?? []) stacks.push({ item: it.item, count: 1 });
  if (b.output) stacks.push(b.output);
  stacks.push(...(b.input ?? []), ...(b.slots ?? []));
  return stacks;
}

/** Кладёт все стеки в слоты; при неудаче возвращает false (слоты тогда не определены). */
function addAll(slots: ItemStack[], slotCount: number, stacks: readonly ItemStack[]): boolean {
  for (const s of stacks) {
    for (let i = 0; i < s.count; i++) if (!add(slots, slotCount, s.item)) return false;
  }
  return true;
}

/**
 * Сносит здание, которому принадлежит клетка; пустая клетка — без эффекта.
 * Содержимое уходит в инвентарь игрока; если оно не помещается целиком, снос не выполняется.
 */
export function demolishAt(
  state: BuildingsState,
  x: number,
  y: number,
  defs: BuildingDefs = contentBuildings,
  slotCount: number = INVENTORY_SLOTS,
): void {
  const building = buildingAt(state, x, y);
  if (!building) return;
  const trial = state.inventory.map((s) => ({ ...s }));
  const stacks = contents(building);
  if (!addAll(trial, slotCount, stacks)) return;
  state.inventory = trial;
  setOccupancy(state.map, building, defs[building.type]!.size, 0);
  delete state.buildings[building.id];
}
