import { BELT_CELL, BELT_GAP, pushToBelt } from './belt';
import type { AcceptLimit, BuildingDefs, PlacedBuilding } from './buildings';
import { crafterAccept, crafterCanAccept } from './crafter';
import { fuelAccept, fuelCanAccept } from './fuel';
import { add, canAdd, takeFirst } from './inventory';
import { labAccept, labCanAccept } from './lab';

/**
 * Принимает ли здание предмет прямо сейчас. Бур и манипулятор не принимают ничего; разделитель — один предмет в пустой буфер.
 * unlocked — открытые рецепты (state.research.unlocked): печь не берёт предмет без открытого рецепта; без параметра открыто всё.
 * active — активная технология (state.research.active): лаборатория берёт только её пакеты (и лишь до запаса в 2 единицы); без параметра не берёт ничего.
 * limit — лимит запаса крафтера и лаборатории: `buffer` (по умолчанию, манипуляторы) или `stack` (до стопки, ручная перекладка).
 */
export function canAccept(
  b: PlacedBuilding,
  item: string,
  defs: BuildingDefs,
  unlocked?: readonly string[],
  active?: string | null,
  limit: AcceptLimit = 'buffer',
): boolean {
  const def = defs[b.type];
  if (!def) return false;
  switch (def.behavior) {
    case 'belt':
    case 'underground': {
      const last = b.belt?.[b.belt.length - 1];
      return !last || last.pos >= BELT_GAP;
    }
    case 'splitter':
    case 'filterSplitter':
      // Буфер разделителя — один предмет; руками (limit 'stack') в разделитель не кладут (TASK-37).
      return limit === 'buffer' && !b.belt?.length;
    case 'crafter':
      return crafterCanAccept(b, def, item, undefined, unlocked, limit);
    case 'container':
      return canAdd(b.slots ?? [], def.slots ?? 0, item);
    case 'generator':
      return fuelCanAccept(b, def, item);
    case 'lab':
      return labCanAccept(b, item, active, limit);
    case 'miner':
    case 'inserter':
    case 'pole':
    case 'turret':
      // Бур, манипулятор и столб ничего не принимают; turret — заготовка M4 (здания пока нет).
      return false;
  }
  // Исчерпывающий switch: новое поведение без решения здесь не компилируется.
  const unreachable: never = def.behavior;
  return unreachable;
}

/** Кладёт предмет; перед этим нужно проверить canAccept (с теми же unlocked). */
export function accept(b: PlacedBuilding, item: string, defs: BuildingDefs, unlocked?: readonly string[]): void {
  const def = defs[b.type]!;
  switch (def.behavior) {
    case 'belt':
    case 'underground':
      pushToBelt(b, item);
      return;
    case 'splitter':
    case 'filterSplitter':
      b.belt = [{ item, pos: BELT_CELL / 2 }];
      return;
    case 'crafter':
      crafterAccept(b, def, item, undefined, unlocked);
      return;
    case 'container':
      add((b.slots ??= []), def.slots ?? 0, item);
      return;
    case 'generator':
      fuelAccept(b, item);
      return;
    case 'lab':
      labAccept(b, item);
      return;
    case 'miner':
    case 'inserter':
    case 'pole':
    case 'turret':
      // Эти здания canAccept не принимают, accept для них не зовут.
      return;
  }
  const unreachable: never = def.behavior;
  return unreachable;
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
  const behavior = defs[b.type]?.behavior;
  switch (behavior) {
    case undefined:
      return null;
    case 'belt': {
      const i = (b.belt ?? []).findIndex((it) => accepts(it.item));
      return i < 0 ? null : b.belt!.splice(i, 1)[0]!.item;
    }
    case 'underground': {
      // Из входа берётся только то, что ещё на поверхности, не в тоннеле.
      const i = (b.belt ?? []).findIndex((it) => it.pos <= BELT_CELL && accepts(it.item));
      return i < 0 ? null : b.belt!.splice(i, 1)[0]!.item;
    }
    case 'splitter':
    case 'filterSplitter': {
      // Из буфера, мимо круга выходов; фильтр не учитывается.
      const held = b.belt?.[0];
      return held && accepts(held.item) ? b.belt!.shift()!.item : null;
    }
    case 'miner':
    case 'crafter':
      return takeOutput(b, accepts);
    case 'container':
      return takeFirst(b.slots ?? [], accepts);
    case 'lab': {
      // Только пакеты из ячеек (b.input); пакеты идущей единицы уже списаны в b.unit и не берутся.
      // Опустевший стек остаётся с нулём — как после старта единицы (runLab), формат сейва тот же.
      const stack = (b.input ?? []).find((s) => s.count > 0 && accepts(s.item));
      if (!stack) return null;
      stack.count -= 1;
      return stack.item;
    }
    case 'generator':
    case 'inserter':
    case 'pole':
    case 'turret':
      // Из генератора (топливо), руки манипулятора и столба манипулятор ничего не берёт.
      return null;
  }
  const unreachable: never = behavior;
  return unreachable;
}
