import { items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { add, canAdd, takeFirst } from './inventory';
import type { ItemStack } from './buildings';

const STACK = items.ironOre.stack;

describe('ячейки инвентаря', () => {
  it('складывает один вид в одну ячейку до stack, потом занимает новую', () => {
    const slots: ItemStack[] = [];
    for (let i = 0; i < STACK + 1; i++) add(slots, 4, 'ironOre');
    expect(slots).toEqual([
      { item: 'ironOre', count: STACK },
      { item: 'ironOre', count: 1 },
    ]);
  });

  it('разные виды занимают разные ячейки', () => {
    const slots: ItemStack[] = [];
    add(slots, 4, 'ironOre');
    add(slots, 4, 'ironPlate');
    expect(slots).toHaveLength(2);
  });

  it('не принимает, когда все ячейки заполнены', () => {
    const slots: ItemStack[] = [{ item: 'ironOre', count: STACK }];
    expect(canAdd(slots, 1, 'ironOre')).toBe(false);
    expect(canAdd(slots, 1, 'ironPlate')).toBe(false);
    expect(canAdd(slots, 2, 'ironPlate')).toBe(true);
  });

  it('takeFirst берёт по одному из первой подходящей ячейки и убирает пустые', () => {
    const slots: ItemStack[] = [
      { item: 'ironOre', count: 1 },
      { item: 'ironPlate', count: 2 },
    ];
    expect(takeFirst(slots, (item) => item === 'ironPlate')).toBe('ironPlate');
    expect(slots[1]).toEqual({ item: 'ironPlate', count: 1 });
    expect(takeFirst(slots, () => true)).toBe('ironOre');
    expect(slots).toEqual([{ item: 'ironPlate', count: 1 }]);
    expect(takeFirst(slots, () => false)).toBeNull();
  });
});
