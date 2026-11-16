export const PACKAGE = '@factory/sim';

export { depositAt, type Deposit, type GameMap, type MapParams, type Tile } from './grid';
export { buildingAt, footprintSize, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
export { createState, type SimState } from './state';
export { tick } from './tick';
export { applyCommand, type Command } from './commands';
export { hash } from './hash';
export { nextRandom, rngStep, type RngStep } from './rng';
export { runTicks, type ScheduledCommand } from './replay';
