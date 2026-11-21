import { buildings as contentBuildings, INVENTORY_SLOTS } from '@factory/content';
import { type BuildingDefs, type ItemStack, type PlacedBuilding } from './buildings';
import { add, countOf, removeItems } from './inventory';
import { accept, canAccept } from './transfer';

/**
 * Адрес ячейки здания для takeFromBuilding:
 * - `output` — выход (бур, печь, сборщик);
 * - `fuel` — ячейка топлива (печь, генератор);
 * - `input` — стек входа крафтера под номером index (порядок ингредиентов рецепта);
 * - `slot` — ячейка сундука под номером index.
 */
export type BuildingSlot =
  | { kind: 'output' }
  | { kind: 'fuel' }
  | { kind: 'input'; index: number }
  | { kind: 'slot'; index: number };

interface ManualState {
  buildings: Record<number, PlacedBuilding>;
  inventory: ItemStack[];
  /** Открытые рецепты: печь не принимает предмет без открытого рецепта. */
  research: { unlocked: readonly string[]; active: string | null };
}

function buildingById(state: ManualState, id: number): PlacedBuilding | undefined {
  return Object.hasOwn(state.buildings, id) ? state.buildings[id] : undefined;
}

/** Стек по адресу ячейки (непустой или нет); undefined, если такой ячейки нет. */
function stackAt(b: PlacedBuilding, slot: BuildingSlot): ItemStack | undefined {
  switch (slot.kind) {
    case 'output':
      return b.output ?? undefined;
    case 'fuel':
      return b.fuel;
    case 'input':
      return Number.isInteger(slot.index) ? b.input?.[slot.index] : undefined;
    case 'slot':
      return Number.isInteger(slot.index) ? b.slots?.[slot.index] : undefined;
  }
}

/** Убирает опустевшую ячейку из здания. */
function dropIfEmpty(b: PlacedBuilding, slot: BuildingSlot, stack: ItemStack): void {
  if (stack.count > 0) return;
  switch (slot.kind) {
    case 'output':
      b.output = null;
      break;
    case 'fuel':
      delete b.fuel;
      break;
    case 'slot':
      b.slots!.splice(slot.index, 1);
      break;
    // Стек входа остаётся с нулём: набор стеков задаёт рецепт (см. crafter.ts).
  }
}

/**
 * Переносит ячейку здания в инвентарь целиком или сколько помещается.
 * Ингредиенты идущего цикла (уже списанные со входа) не трогает. Неверный адрес, пустая
 * ячейка и неизвестное здание — без изменений. slotCount — размер инвентаря (для тестов).
 */
export function takeFromBuilding(state: ManualState, buildingId: number, slot: BuildingSlot, slotCount: number = INVENTORY_SLOTS): void {
  const b = buildingById(state, buildingId);
  const stack = b && slot && stackAt(b, slot);
  if (!b || !stack || stack.count <= 0) return;
  let moved = 0;
  while (moved < stack.count && add(state.inventory, slotCount, stack.item)) moved += 1;
  stack.count -= moved;
  dropIfEmpty(b, slot, stack);
}

/**
 * Кладёт из инвентаря в здание до count предметов вида item туда, куда положил бы манипулятор
 * (canAccept/accept из transfer.ts), но без лимита запаса: ячейка крафтера и лаборатории берёт до стопки предмета.
 * Что не принято, остаётся в инвентаре; кладётся не больше, чем есть.
 */
export function putIntoBuilding(
  state: ManualState,
  buildingId: number,
  item: string,
  count: number,
  defs: BuildingDefs = contentBuildings,
): void {
  const b = buildingById(state, buildingId);
  if (!b || !Number.isInteger(count) || count <= 0) return;
  const limit = Math.min(count, countOf(state.inventory, item));
  let moved = 0;
  while (moved < limit && canAccept(b, item, defs, state.research.unlocked, state.research.active, 'stack')) {
    accept(b, item, defs, state.research.unlocked);
    moved += 1;
  }
  if (moved > 0) removeItems(state.inventory, item, moved);
}
