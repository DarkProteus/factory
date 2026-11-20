import type { ItemId } from './items';

/** Прямоугольное пятно залежи: левый верхний угол, размер, запас руды в каждой клетке. */
export interface DepositPatch {
  item: ItemId;
  x: number;
  y: number;
  w: number;
  h: number;
  amount: number;
}

/** Стартовая карта: центр (64, 64), пятна в 10–20 клетках от него. */
export const startMap: { width: number; height: number; patches: readonly DepositPatch[] } = {
  width: 128,
  height: 128,
  patches: [
    { item: 'ironOre', x: 76, y: 58, w: 6, h: 6, amount: 300 },
    { item: 'copperOre', x: 46, y: 58, w: 6, h: 6, amount: 300 },
    { item: 'coal', x: 61, y: 46, w: 6, h: 6, amount: 300 },
    { item: 'stone', x: 61, y: 76, w: 6, h: 6, amount: 300 },
  ],
};
