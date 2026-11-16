import type { RecipeDef } from './types';

export const recipes = {
  smeltIron: { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 180, madeIn: 'furnace' },
} satisfies Record<string, RecipeDef>;
