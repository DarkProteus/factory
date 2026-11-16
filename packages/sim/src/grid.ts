import { items } from '@factory/content';

/** Тип тайла. Пока есть только земля; поле нужно для будущих видов местности. */
export type Tile = 'ground';

export interface Deposit {
  /** id предмета из content.items. */
  item: string;
  amount: number;
}

/** Карта: плоские массивы длиной width*height, индекс клетки — y*width + x. */
export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[];
  deposits: (Deposit | null)[];
  /** id здания, занимающего клетку, или 0. */
  occupancy: number[];
}

export interface MapParams {
  width: number;
  height: number;
  deposits?: { x: number; y: number; item: string; amount: number }[];
}

export const DEFAULT_MAP: MapParams = { width: 64, height: 64 };

export function inBounds(map: GameMap, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function cellIndex(map: GameMap, x: number, y: number): number {
  return y * map.width + x;
}

export function createMap({ width, height, deposits = [] }: MapParams = DEFAULT_MAP): GameMap {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`Неверный размер карты ${width}×${height}`);
  }
  const size = width * height;
  const map: GameMap = {
    width,
    height,
    tiles: new Array<Tile>(size).fill('ground'),
    deposits: new Array<Deposit | null>(size).fill(null),
    occupancy: new Array<number>(size).fill(0),
  };
  for (const { x, y, item, amount } of deposits) {
    if (!inBounds(map, x, y)) throw new RangeError(`Залежь вне карты: ${x},${y}`);
    if (!Object.hasOwn(items, item)) throw new Error(`Неизвестный предмет залежи: ${item}`);
    map.deposits[cellIndex(map, x, y)] = { item, amount };
  }
  return map;
}

/** Залежь в клетке или null (в том числе для клеток вне карты). */
export function depositAt(state: { map: GameMap }, x: number, y: number): Deposit | null {
  const { map } = state;
  return inBounds(map, x, y) ? (map.deposits[cellIndex(map, x, y)] ?? null) : null;
}
