import type { ItemId } from './items';
import type { BuildingDef } from './types';

export const buildings = {
  drill: { size: [2, 2], energy: { kind: 'electric', kw: 90 }, behavior: 'miner', hp: 150, miningTicks: 60, buffer: 5 },
  belt: { size: [1, 1], behavior: 'belt', hp: 50, beltSpeed: 8 },
  furnace: {
    size: [2, 2],
    energy: { kind: 'fuel', kw: 90 },
    behavior: 'crafter',
    recipeMode: 'byInput',
    fuelSlot: true,
    hp: 200,
    inputBuffer: 2,
    buffer: 50,
  },
  inserter: { size: [1, 1], energy: { kind: 'electric', kw: 13 }, behavior: 'inserter', hp: 50, swingTicks: 30 },
  chest: { size: [1, 1], behavior: 'container', hp: 100, slots: 16 },
  splitter: { size: [1, 1], behavior: 'splitter', hp: 50 },
  assembler: {
    size: [3, 3],
    energy: { kind: 'electric', kw: 75 },
    behavior: 'crafter',
    recipeMode: 'chosen',
    hp: 250,
    inputBuffer: 2,
    buffer: 50,
  },
  lab: { size: [3, 3], energy: { kind: 'electric', kw: 60 }, behavior: 'lab', hp: 250 },
  // Подземные и быстрые ленты: скорость быстрых вдвое выше обычной (beltSpeed 8).
  undergroundBelt: { size: [1, 1], behavior: 'underground', hp: 50, beltSpeed: 8, undergroundReach: 4 },
  fastUndergroundBelt: { size: [1, 1], behavior: 'underground', hp: 50, beltSpeed: 16, undergroundReach: 4 },
  fastBelt: { size: [1, 1], behavior: 'belt', hp: 50, beltSpeed: 16 },
  fastInserter: { size: [1, 1], energy: { kind: 'electric', kw: 46 }, behavior: 'inserter', hp: 50, swingTicks: 15 },
  filterSplitter: { size: [1, 1], behavior: 'filterSplitter', hp: 50 },
  pole: { size: [1, 1], behavior: 'pole', hp: 50, coverage: 5, wireReach: 7 },
  generator: {
    size: [3, 3],
    energy: { kind: 'generator', kw: 900 },
    behavior: 'generator',
    fuelSlot: true,
    hp: 300,
  },
} satisfies Record<string, BuildingDef<ItemId>>;

/** id здания из таблицы buildings. */
export type BuildingId = keyof typeof buildings;
