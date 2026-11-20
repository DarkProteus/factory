import { items as contentItems } from '@factory/content';
import type { ItemStack } from './buildings';

/**
 * Ячейки: массив непустых стеков, не длиннее slotCount.
 * Ячейка хранит один вид предмета, не больше stack из content.items.
 */
type ItemDefs = Readonly<Record<string, { stack: number }>>;

const stackOf = (item: string, defs: ItemDefs): number => defs[item]?.stack ?? 0;

/** Помещается ли ещё один предмет. */
export function canAdd(slots: readonly ItemStack[], slotCount: number, item: string, defs: ItemDefs = contentItems): boolean {
  const stack = stackOf(item, defs);
  if (stack <= 0) return false;
  return slots.length < slotCount || slots.some((s) => s.item === item && s.count < stack);
}

/** Кладёт один предмет: в неполную ячейку того же вида, иначе в новую. Возвращает успех. */
export function add(slots: ItemStack[], slotCount: number, item: string, defs: ItemDefs = contentItems): boolean {
  if (!canAdd(slots, slotCount, item, defs)) return false;
  const stack = stackOf(item, defs);
  const part = slots.find((s) => s.item === item && s.count < stack);
  if (part) part.count += 1;
  else slots.push({ item, count: 1 });
  return true;
}

/** Берёт один предмет из первой ячейки, вид которой подходит accepts; пустую ячейку убирает. */
export function takeFirst(slots: ItemStack[], accepts: (item: string) => boolean): string | null {
  const i = slots.findIndex((s) => accepts(s.item));
  if (i < 0) return null;
  const slot = slots[i]!;
  slot.count -= 1;
  if (slot.count <= 0) slots.splice(i, 1);
  return slot.item;
}
