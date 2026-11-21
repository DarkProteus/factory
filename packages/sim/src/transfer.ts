import { BELT_GAP, pushToBelt } from './belt';
import type { BuildingDefs, PlacedBuilding } from './buildings';
import { crafterAccept, crafterCanAccept } from './crafter';
import { fuelAccept, fuelCanAccept } from './fuel';
import { add, canAdd, takeFirst } from './inventory';

/**
 * Принимает ли здание предмет прямо сейчас. Бур и манипулятор не принимают ничего.
 * unlocked — открытые рецепты (state.research.unlocked): печь не берёт предмет без открытого рецепта; без параметра открыто всё.
 */
export function canAccept(b: PlacedBuilding, item: string, defs: BuildingDefs, unlocked?: readonly string[]): boolean {
  const def = defs[b.type];
  if (!def) return false;
  switch (def.behavior) {
    case 'belt': {
      const last = b.belt?.[b.belt.length - 1];
      return !last || last.pos >= BELT_GAP;
    }
    case 'crafter':
      return crafterCanAccept(b, def, item, undefined, unlocked);
    case 'container':
      return canAdd(b.slots ?? [], def.slots ?? 0, item);
    case 'generator':
      return fuelCanAccept(b, def, item);
    default:
      return false;
  }
}

/** Кладёт предмет; перед этим нужно проверить canAccept (с теми же unlocked). */
export function accept(b: PlacedBuilding, item: string, defs: BuildingDefs, unlocked?: readonly string[]): void {
  const def = defs[b.type]!;
  switch (def.behavior) {
    case 'belt':
      pushToBelt(b, item);
      break;
    case 'crafter':
      crafterAccept(b, def, item, undefined, unlocked);
      break;
    case 'container':
      add((b.slots ??= []), def.slots ?? 0, item);
      break;
    case 'generator':
      fuelAccept(b, item);
      break;
  }
}

/** Берёт один предмет из выхода здания, если accepts его одобряет. */
function takeOutput(b: PlacedBuilding, accepts: (item: string) => boolean): string | null {
  if (!b.output || !accepts(b.output.item)) return null;
  const item = b.output.item;
  b.output.count -= 1;
  if (b.output.count <= 0) b.output = null;
  return item;
}

/** Берёт один предмет, который принимает accepts; без подходящего возвращает null. */
export function takeFrom(b: PlacedBuilding, accepts: (item: string) => boolean, defs: BuildingDefs): string | null {
  switch (defs[b.type]?.behavior) {
    case 'belt': {
      const i = (b.belt ?? []).findIndex((it) => accepts(it.item));
      return i < 0 ? null : b.belt!.splice(i, 1)[0]!.item;
    }
    case 'miner':
    case 'crafter':
      return takeOutput(b, accepts);
    case 'container':
      return takeFirst(b.slots ?? [], accepts);
    default:
      return null;
  }
}
