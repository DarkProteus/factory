import type { BuildingDef } from './types';

export const buildings = {
  drill: { size: [2, 2], power: 0, behavior: 'miner', hp: 150, miningTicks: 60, buffer: 5 },
  belt: { size: [1, 1], power: 0, behavior: 'belt', hp: 50, beltSpeed: 8 },
  furnace: { size: [2, 2], power: 0, behavior: 'crafter', hp: 200 },
} satisfies Record<string, BuildingDef>;
