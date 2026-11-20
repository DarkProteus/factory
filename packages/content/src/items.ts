import type { ItemDef } from './types';

export const items = {
  ironOre: { name: 'Железная руда', stack: 50 },
  ironPlate: { name: 'Железная пластина', stack: 100 },
  ammo: { name: 'Патроны', stack: 100 },
} satisfies Record<string, ItemDef>;

/** id предмета из таблицы items. */
export type ItemId = keyof typeof items;
