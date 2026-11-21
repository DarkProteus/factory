import { describe, expect, it } from 'vitest';
import { nextRandom, rngStep } from './rng';

/** Эталон: пять шагов mulberry32 для зерна; значения сняты с реализации и фиксируют сам генератор. */
const REFERENCE: Record<number, [number, number][]> = {
  0: [
    [0.26642920868471265, 1831565813],
    [0.0003297457005828619, -631835670],
    [0.2232720274478197, 1199730143],
    [0.1462021479383111, -1263671340],
    [0.46732782293111086, 567894473],
  ],
  1: [
    [0.6270739405881613, 1831565814],
    [0.002735721180215478, -631835669],
    [0.5274470399599522, 1199730144],
    [0.9810509674716741, -1263671339],
    [0.9683778982143849, 567894474],
  ],
  12345: [
    [0.9797282677609473, 1831578158],
    [0.3067522644996643, -631823325],
    [0.484205421525985, 1199742488],
    [0.817934412509203, -1263658995],
    [0.5094283693470061, 567906818],
  ],
  [-1]: [
    [0.8964226141106337, 1831565812],
    [0.189478256739676, -631835671],
    [0.7156526781618595, 1199730142],
    [0.9440599093213677, -1263671341],
    [0.8452364315744489, 567894472],
  ],
};

describe('rngStep', () => {
  for (const [seed, steps] of Object.entries(REFERENCE)) {
    it(`даёт эталонную последовательность для зерна ${seed}`, () => {
      let state = Number(seed);
      for (const [value, next] of steps) {
        const r = rngStep(state);
        expect(r.value).toBe(value);
        expect(r.next).toBe(next);
        state = r.next;
      }
    });
  }

  it('значение лежит в [0, 1)', () => {
    let state = 7;
    for (let i = 0; i < 1000; i++) {
      const r = rngStep(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      state = r.next;
    }
  });

  it('чистая: тот же вход даёт тот же результат', () => {
    expect(rngStep(42)).toEqual(rngStep(42));
  });
});

describe('nextRandom', () => {
  it('отдаёт эталонные значения и сдвигает holder.rng', () => {
    const holder = { rng: 0 };
    for (const [value, next] of REFERENCE[0]!) {
      expect(nextRandom(holder)).toBe(value);
      expect(holder.rng).toBe(next);
    }
  });
});
