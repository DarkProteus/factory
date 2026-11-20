import { items as contentItems, type BuildingDef, type ItemDef } from '@factory/content';
import type { PlacedBuilding } from './buildings';

/**
 * Единицы энергии в состоянии: Вт·тик (энергия 1 Вт за один тик). Тиков в секунду 60,
 * поэтому 1 кДж = 1000 Дж = 60 000 Вт·тик, а расход печи kw кВт за тик — ровно kw * 1000.
 * Всё целочисленно: никаких дробей и накопления ошибки.
 */
export const FUEL_UNITS_PER_KJ = 60_000;

type ItemDefs = Readonly<Record<string, ItemDef>>;

/** Есть ли у предмета энергия сгорания (его можно класть в ячейку топлива). */
export function isFuel(item: string, defs: ItemDefs = contentItems): boolean {
  return defs[item]?.fuel !== undefined;
}

/** Принимает ли ячейка топлива здания этот предмет: она одна стопка одного вида топлива. */
export function fuelCanAccept(b: PlacedBuilding, def: BuildingDef, item: string, defs: ItemDefs = contentItems): boolean {
  if (!def.fuelSlot || !isFuel(item, defs)) return false;
  return !b.fuel || (b.fuel.item === item && b.fuel.count < (defs[item]?.stack ?? 0));
}

/** Кладёт один предмет в ячейку топлива; перед этим нужно проверить fuelCanAccept. */
export function fuelAccept(b: PlacedBuilding, item: string): void {
  if (b.fuel) b.fuel.count += 1;
  else b.fuel = { item, count: 1 };
}

/**
 * Списывает энергию одного тика работы здания, которое жжёт топливо (energy.kind 'fuel').
 * Остаток энергии лежит в b.burn; когда его не хватает, из ячейки сгорает один предмет.
 * Возвращает false, если энергии нет и топлива в ячейке тоже: работа в этот тик стоит.
 */
export function burnTick(b: PlacedBuilding, def: BuildingDef, defs: ItemDefs = contentItems): boolean {
  if (def.energy?.kind !== 'fuel') return true;
  const cost = def.energy.kw * 1000;
  let burn = b.burn ?? 0;
  while (burn < cost) {
    if (!b.fuel) {
      if (burn > 0) b.burn = burn;
      return false;
    }
    burn += (defs[b.fuel.item]?.fuel ?? 0) * FUEL_UNITS_PER_KJ;
    b.fuel.count -= 1;
    if (b.fuel.count <= 0) delete b.fuel;
  }
  b.burn = burn - cost;
  return true;
}

/**
 * Списывает до cost единиц энергии (Вт·тик) из остатка b.burn и ячейки топлива (генератор).
 * Возвращает, сколько списано: меньше cost, только если топливо кончилось.
 */
export function burnEnergy(b: PlacedBuilding, cost: number, defs: ItemDefs = contentItems): number {
  let burn = b.burn ?? 0;
  while (burn < cost && b.fuel) {
    burn += (defs[b.fuel.item]?.fuel ?? 0) * FUEL_UNITS_PER_KJ;
    b.fuel.count -= 1;
    if (b.fuel.count <= 0) delete b.fuel;
  }
  const spent = Math.min(burn, cost);
  b.burn = burn - spent;
  return spent;
}

/** Может ли генератор выдавать энергию: есть остаток сожжённого или топливо в ячейке. */
export function hasEnergy(b: PlacedBuilding): boolean {
  return (b.burn ?? 0) > 0 || b.fuel !== undefined;
}
