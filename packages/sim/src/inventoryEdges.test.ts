import { items } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { add, canAdd, countOf, removeItems, takeFirst } from './inventory';
import type { ItemStack } from './buildings';

const STACK = items.ironOre.stack;

describe('countOf', () => {
  it('суммирует все ячейки нужного вида и не считает другие', () => {
    const slots: ItemStack[] = [
      { item: 'ironOre', count: 3 },
      { item: 'coal', count: 100 },
      { item: 'ironOre', count: 5 },
    ];
    expect(countOf(slots, 'ironOre')).toBe(8);
    expect(countOf(slots, 'coal')).toBe(100);
    expect(countOf(slots, 'copperOre')).toBe(0);
    expect(countOf([], 'ironOre')).toBe(0);
  });
});

describe('removeItems', () => {
  it('снимает с нескольких ячеек подряд, пустые убирает, остальное не трогает', () => {
    const slots: ItemStack[] = [
      { item: 'ironOre', count: 2 },
      { item: 'ironOre', count: 2 },
      { item: 'ironOre', count: 2 },
      { item: 'ironOre', count: 9 },
    ];
    removeItems(slots, 'ironOre', 7);
    expect(slots).toEqual([{ item: 'ironOre', count: 8 }]);
  });

  it('пропускает чужие ячейки, не смещая счёт', () => {
    const slots: ItemStack[] = [
      { item: 'coal', count: 4 },
      { item: 'ironOre', count: 1 },
      { item: 'coal', count: 4 },
      { item: 'ironOre', count: 3 },
    ];
    removeItems(slots, 'ironOre', 3);
    expect(slots).toEqual([
      { item: 'coal', count: 4 },
      { item: 'coal', count: 4 },
      { item: 'ironOre', count: 1 },
    ]);
  });

  it('остановившись на нуле, дальше ячейки не трогает', () => {
    const slots: ItemStack[] = [
      { item: 'ironOre', count: 4 },
      { item: 'ironOre', count: 4 },
    ];
    removeItems(slots, 'ironOre', 4);
    expect(slots).toEqual([{ item: 'ironOre', count: 4 }]);
  });

  it('если предметов меньше, чем просят, опустошает и не падает', () => {
    const slots: ItemStack[] = [
      { item: 'coal', count: 1 },
      { item: 'ironOre', count: 2 },
    ];
    removeItems(slots, 'ironOre', 10);
    expect(slots).toEqual([{ item: 'coal', count: 1 }]);
    removeItems(slots, 'ironOre', 1);
    removeItems(slots, 'coal', 0);
    expect(slots).toEqual([{ item: 'coal', count: 1 }]);
  });
});

describe('add / canAdd / takeFirst: границы', () => {
  it('неизвестный предмет не помещается ни в какие ячейки', () => {
    const slots: ItemStack[] = [];
    expect(canAdd(slots, 4, 'gold')).toBe(false);
    expect(add(slots, 4, 'gold')).toBe(false);
    expect(slots).toEqual([]);
    expect(canAdd(slots, 4, 'x', { x: { stack: 0 } })).toBe(false);
  });

  it('новая ячейка — пока ячеек меньше slotCount; полные ячейки не принимают', () => {
    const full: ItemStack[] = [{ item: 'ironOre', count: STACK }];
    expect(canAdd(full, 2, 'ironOre')).toBe(true);
    expect(canAdd(full, 1, 'ironOre')).toBe(false);
    expect(canAdd([{ item: 'ironOre', count: STACK - 1 }], 1, 'ironOre')).toBe(true);
    expect(canAdd([{ item: 'coal', count: 1 }], 1, 'ironOre')).toBe(false);
    expect(canAdd([], 0, 'ironOre')).toBe(false);
  });

  it('add долкладывает в неполную ячейку, не начиная новую', () => {
    const slots: ItemStack[] = [
      { item: 'ironOre', count: STACK },
      { item: 'ironOre', count: 1 },
    ];
    expect(add(slots, 2, 'ironOre')).toBe(true);
    expect(slots).toEqual([
      { item: 'ironOre', count: STACK },
      { item: 'ironOre', count: 2 },
    ]);
  });

  it('takeFirst берёт из первой подходящей ячейки и убирает опустевшую', () => {
    const slots: ItemStack[] = [
      { item: 'coal', count: 1 },
      { item: 'ironOre', count: 1 },
      { item: 'ironOre', count: 2 },
    ];
    expect(takeFirst(slots, (i) => i === 'ironOre')).toBe('ironOre');
    expect(slots).toEqual([
      { item: 'coal', count: 1 },
      { item: 'ironOre', count: 2 },
    ]);
    expect(takeFirst(slots, (i) => i === 'ironOre')).toBe('ironOre');
    expect(slots).toEqual([
      { item: 'coal', count: 1 },
      { item: 'ironOre', count: 1 },
    ]);
    expect(takeFirst(slots, (i) => i === 'gold')).toBeNull();
  });
});
