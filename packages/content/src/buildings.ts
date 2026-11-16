import type { BuildingDef } from './types';

export const buildings = {
  drill: { size: [2, 2], power: 0, behavior: 'miner', hp: 150 },
  furnace: { size: [2, 2], power: 0, behavior: 'crafter', hp: 200 },
} satisfies Record<string, BuildingDef>;
