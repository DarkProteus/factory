import { items as contentItems, technologies, type BuildingDef, type ItemDef } from '@factory/content';
import type { AcceptLimit, BuildingDefs, ItemStack, PlacedBuilding } from './buildings';
import { electricTick } from './power';
import { addResearchProgress } from './research';
import type { SimState } from './state';

/**
 * Поведение lab. Модель исследования:
 * - Ячейки пакетов — b.input: стеки по одному на вид пакета, принимаются только пакеты активной технологии
 *   (technologies[active].unit; без активной — ничего) и пока в ячейке меньше LAB_BUFFER_UNITS единиц этого вида.
 * - Лаборатория ведёт собственную единицу: b.unit — id технологии, чьи пакеты списаны, b.progress — её тики (0..unitTicks).
 *   Единица стартует, когда есть активная технология, в ячейках хватает пакетов и сеть даёт энергию: пакеты списываются.
 * - Каждый тик работы (electricTick: скорость × удовлетворённость сети) лаборатория добавляет 1 тик в общий
 *   прогресс технологии (addResearchProgress). Поэтому N лабораторий проходят технологию за units × unitTicks / N тиков,
 *   а набравшая unitTicks локальная единица закрывается и стартует следующую. Пакетов уходит по одному набору на единицу
 *   каждой лаборатории: ровно units наборов, если units делится на N; иначе единицы, не доделанные к концу технологии,
 *   возвращаются (недоплата до N-1 наборов).
 * - Простой (нет технологии, пакетов или единицы чужой технологии) — без спроса энергии (b.draw не ставится).
 * - Смена технологии (releaseLabUnits из команды setResearch) и её завершение (лениво, на следующем тике лаборатории)
 *   возвращают пакеты идущей единицы в ячейки и обнуляют b.progress. Возврат не ограничен вместимостью ячейки:
 *   пакеты не пропадают и не застревают, ячейка может временно превысить лимит приёма (тогда новые не принимаются).
 */

const itemDefs: Readonly<Record<string, ItemDef>> = contentItems;

type Unit = Readonly<Record<string, number>>;

function stackOf(b: PlacedBuilding, item: string): ItemStack | undefined {
  return b.input?.find((s) => s.item === item);
}

function techUnit(id: string | undefined): Unit | undefined {
  return id !== undefined && Object.hasOwn(technologies, id) ? technologies[id as keyof typeof technologies].unit : undefined;
}

/** Запас пакетов в ячейке — на столько единиц активной технологии лаборатория берёт пакеты вперёд (чтобы не копить стопку). */
export const LAB_BUFFER_UNITS = 2;

/**
 * Берёт пакет, только если он нужен активной технологии и в ячейке его меньше, чем на LAB_BUFFER_UNITS единиц.
 * Так несколько лабораторий, кормимых из одного источника, делят пакеты поровну. Пакеты сверх лимита
 * (возврат единицы, старый сейв) остаются в ячейке, новые при этом не принимаются.
 * limit `stack` (ручная перекладка) снимает запас: пакет принимается до стопки предмета.
 */
export function labCanAccept(b: PlacedBuilding, item: string, active: string | null | undefined, limit: AcceptLimit = 'buffer'): boolean {
  const need = techUnit(active ?? undefined)?.[item];
  if (need === undefined) return false;
  const cap = limit === 'stack' ? (itemDefs[item]?.stack ?? 0) : need * LAB_BUFFER_UNITS;
  return (stackOf(b, item)?.count ?? 0) < cap;
}

/** Кладёт пакет в ячейку; перед этим нужно проверить labCanAccept. */
export function labAccept(b: PlacedBuilding, item: string): void {
  const stack = stackOf(b, item);
  if (stack) stack.count += 1;
  else (b.input ??= []).push({ item, count: 1 });
}

/** Пакеты идущей единицы (уже списанные с ячеек); пусто, если единицы нет. Используется сносом (contents). */
export function labUnitStacks(b: PlacedBuilding): ItemStack[] {
  return Object.entries(techUnit(b.unit) ?? {}).map(([item, count]) => ({ item, count }));
}

/** Возвращает пакеты идущей единицы в ячейки и сбрасывает локальный прогресс. */
function releaseUnit(b: PlacedBuilding): void {
  for (const { item, count } of labUnitStacks(b)) {
    const stack = stackOf(b, item);
    if (stack) stack.count += count;
    else (b.input ??= []).push({ item, count });
  }
  delete b.unit;
  b.progress = 0;
}

/** Возвращает пакеты единиц, не относящихся к активной технологии, у всех лабораторий (после setResearch). */
export function releaseLabUnits(state: SimState): void {
  for (const b of Object.values(state.buildings)) {
    if (b.unit !== undefined && b.unit !== state.research.active) releaseUnit(b);
  }
}

function hasPacks(b: PlacedBuilding, unit: Unit): boolean {
  return Object.entries(unit).every(([item, n]) => (stackOf(b, item)?.count ?? 0) >= n);
}

export function runLab(state: SimState, b: PlacedBuilding, _def: BuildingDef, _defs: BuildingDefs, satisfaction: number | undefined): void {
  const active = state.research.active;
  if (b.unit !== undefined && b.unit !== active) releaseUnit(b);
  if (active === null) return;
  const tech = technologies[active];
  if (b.unit === undefined && !hasPacks(b, tech.unit)) return;
  // Нет энергии: единица не стартует (пакеты остаются в ячейках), идущая стоит на месте.
  if (!electricTick(b, satisfaction)) return;
  if (b.unit === undefined) {
    for (const [item, n] of Object.entries(tech.unit)) stackOf(b, item)!.count -= n;
    b.unit = active;
    b.progress = 0;
  }
  b.progress += 1;
  addResearchProgress(state, 1);
  if (b.progress >= tech.unitTicks) {
    delete b.unit;
    b.progress = 0;
  }
}
