import type { BuildingDef } from '@factory/content';
import type { BuildingDefs, PlacedBuilding } from './buildings';

/** Длина клетки конвейера в единицах пути. */
export const BELT_CELL = 256;
/** Минимальное расстояние между соседними предметами на конвейере. */
export const BELT_GAP = 64;

/** Предмет на конвейере; pos — пройденный путь от входа в клетку, 0..BELT_CELL. */
export interface BeltItem {
  item: string;
  pos: number;
}

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

/** Ряд предметов конвейера от головы к хвосту; создаётся при первом обращении. */
function lane(b: PlacedBuilding): BeltItem[] {
  return (b.belt ??= []);
}

/** Кладёт предмет в начало конвейера, если там есть зазор. */
export function pushToBelt(b: PlacedBuilding, item: string): boolean {
  const items = lane(b);
  const last = items[items.length - 1];
  if (last && last.pos < BELT_GAP) return false;
  items.push({ item, pos: 0 });
  return true;
}

export const isBelt = (b: PlacedBuilding | null, defs: BuildingDefs): b is PlacedBuilding =>
  b !== null && defs[b.type]?.behavior === 'belt';

/**
 * Двигает предметы конвейера и передаёт головной на цель. Цель — конвейер или разделитель
 * (intoSplitter): разделитель вмещает один предмет, поэтому на стыке с ним головной предмет
 * ждёт в конце клетки, пока буфер не освободится. length — длина ленты: у входа подземного
 * с парой она включает тоннель (underground.ts).
 */
export function moveBelt(
  b: PlacedBuilding,
  def: BuildingDef,
  target: PlacedBuilding | null,
  intoSplitter: boolean,
  length: number = BELT_CELL,
): void {
  const items = lane(b);
  if (items.length === 0) return;
  const speed = def.beltSpeed ?? 0;
  let limit = length;
  if (target && !intoSplitter) {
    const tail = lane(target)[lane(target).length - 1];
    limit += tail ? tail.pos - BELT_GAP : BELT_CELL;
  }
  for (const it of items) {
    it.pos = Math.max(it.pos, Math.min(it.pos + speed, limit));
    limit = it.pos - BELT_GAP;
  }
  if (!target) return;
  if (intoSplitter) {
    if (items[0]!.pos >= length && !target.belt?.length) {
      target.belt = [{ item: items.shift()!.item, pos: BELT_CELL / 2 }];
    }
    return;
  }
  while (items.length > 0 && items[0]!.pos >= length) {
    const it = items.shift()!;
    lane(target).push({ item: it.item, pos: it.pos - length });
  }
}

