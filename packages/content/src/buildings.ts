import type { ItemId } from './items';
import type { BuildingDef } from './types';

export const buildings = {
  drill: { size: [2, 2], power: 0, behavior: 'miner', hp: 150, miningTicks: 60, buffer: 5 },
  belt: { size: [1, 1], power: 0, behavior: 'belt', hp: 50, beltSpeed: 8 },
  furnace: { size: [2, 2], power: 0, behavior: 'crafter', hp: 200, inputBuffer: 2, buffer: 50 },
  inserter: { size: [1, 1], power: 0, behavior: 'inserter', hp: 50, swingTicks: 30 },
  chest: { size: [1, 1], power: 0, behavior: 'container', hp: 100, slots: 16 },
} satisfies Record<string, BuildingDef<ItemId>>;

/** id здания из таблицы buildings. */
export type BuildingId = keyof typeof buildings;
