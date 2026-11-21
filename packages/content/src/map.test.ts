import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS, items, MINING_TICKS, startMap, START_KIT } from './index';

// rule: deposits, start-map
describe('startMap', () => {
  it('карта 128×128', () => {
    expect([startMap.width, startMap.height]).toEqual([128, 128]);
  });

  it('по одному пятну ironOre, copperOre, coal, stone в 10–20 клетках от центра', () => {
    const cx = startMap.width / 2;
    const cy = startMap.height / 2;
    expect(startMap.patches.map((p) => p.item).sort()).toEqual(['coal', 'copperOre', 'ironOre', 'stone']);
    for (const p of startMap.patches) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(startMap.width);
      expect(p.y + p.h).toBeLessThanOrEqual(startMap.height);
      expect(p.amount).toBeGreaterThan(0);
      const dist = Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy);
      expect(dist).toBeGreaterThanOrEqual(10);
      expect(dist).toBeLessThanOrEqual(20);
    }
  });
});

describe('player', () => {
  it('START_KIT из design.md', () => {
    expect(START_KIT).toEqual({ generator: 1, pole: 10, drill: 2, furnace: 2, inserter: 4, belt: 20, chest: 1, coal: 20 });
  });

  it('START_KIT помещается в инвентарь', () => {
    const slots = Object.entries(START_KIT).reduce((a, [id, n]) => a + Math.ceil(n / items[id as keyof typeof items].stack), 0);
    expect(slots).toBeLessThanOrEqual(INVENTORY_SLOTS);
  });

  it('ручная добыча: 30 тиков на руду', () => {
    expect(MINING_TICKS).toBe(30);
  });
});
