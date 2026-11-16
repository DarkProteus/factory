import { buildings as contentBuildings, type BuildingDef } from '@factory/content';
import { cellIndex, inBounds, type GameMap } from './grid';

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
}

/** Таблица определений зданий; по умолчанию берётся из content. */
export type BuildingDefs = Readonly<Record<string, BuildingDef>>;

interface BuildingsState {
  map: GameMap;
  buildings: Record<number, PlacedBuilding>;
  nextId: number;
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

/** Ставит здание; неверную команду (занято, вне карты, неизвестный тип) молча игнорирует. */
export function placeBuilding(
  state: BuildingsState,
  type: string,
  x: number,
  y: number,
  dir: number,
  defs: BuildingDefs = contentBuildings,
): void {
  if (!Object.hasOwn(defs, type) || !isDir(dir) || !inBounds(state.map, x, y)) return;
  const size = defs[type]!.size;
  const [w, h] = footprintSize(size, dir);
  if (!inBounds(state.map, x + w - 1, y + h - 1)) return;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (state.map.occupancy[cellIndex(state.map, x + dx, y + dy)] !== 0) return;
    }
  }
  const building: PlacedBuilding = { id: state.nextId, type, x, y, dir };
  state.nextId += 1;
  state.buildings[building.id] = building;
  setOccupancy(state.map, building, size, building.id);
}

/** Сносит здание, которому принадлежит клетка; пустая клетка — без эффекта. */
export function demolishAt(state: BuildingsState, x: number, y: number, defs: BuildingDefs = contentBuildings): void {
  const building = buildingAt(state, x, y);
  if (!building) return;
  setOccupancy(state.map, building, defs[building.type]!.size, 0);
  delete state.buildings[building.id];
}
