import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hash } from './hash';
import {
  BUNDLES,
  bundleScenarioArb,
  bundleWorld,
  cellsOf,
  placementsArb,
  resolve,
  sinkLevel,
  type BundleScenario,
  type Placement,
} from './propBundles';
import { applyStep, checkConservation, checkInventory, checkOccupancy } from './propKit';
import { tick } from './tick';

// Миры из готовых связок: цепочки реально работают, поэтому прогонов меньше, чем в invariants.test.ts.
// Для длинного прогона в поисках багов поднять numRuns (например, до 300) и таймауты тестов.
const params = { numRuns: 15 };
const isDemolish = (s: BundleScenario['steps'][number]): boolean => s.kind === 'cmd' && s.command.type === 'demolish';

describe('инварианты sim на мирах из связок (property-based)', () => {
  it('занятость карты и инвентарь согласованы после каждого шага', () => {
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const { state, ledger } = bundleWorld(seed, placements, noise);
        checkOccupancy(state);
        for (const step of steps) {
          applyStep(state, ledger, step);
          checkOccupancy(state);
          checkInventory(state);
        }
      }),
      params,
    );
  }, 30_000);

  it('снос: либо здание удалено, либо ничего не изменилось в инвентаре', () => {
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const { state, ledger } = bundleWorld(seed, placements, noise, true);
        for (const step of steps) {
          const before = isDemolish(step) ? JSON.stringify(state.inventory) : null;
          const demolished = applyStep(state, ledger, step);
          if (isDemolish(step) && !demolished) expect(JSON.stringify(state.inventory)).toBe(before);
          checkOccupancy(state);
        }
      }),
      params,
    );
  }, 30_000);

  it.each([
    ['пустой инвентарь', false],
    ['почти полный инвентарь', true],
  ] as const)('сохранение предметов в связках (уголь и пакеты вне баланса): %s', (_name, full) => {
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const { state, ledger } = bundleWorld(seed, placements, noise, full);
        checkConservation(state, ledger);
        for (const step of steps) {
          applyStep(state, ledger, step);
          checkConservation(state, ledger);
          checkInventory(state);
        }
      }),
      params,
    );
  }, 30_000);

  it('одно зерно и одна последовательность дают один хеш на каждом шаге (два прогона)', () => {
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const a = bundleWorld(seed, placements, noise);
        const b = bundleWorld(seed, placements, noise);
        expect(hash(a.state)).toBe(hash(b.state));
        for (const step of steps) {
          applyStep(a.state, a.ledger, step);
          applyStep(b.state, b.ledger, step);
          expect(hash(a.state)).toBe(hash(b.state));
        }
      }),
      params,
    );
  }, 30_000);
});

/** Прогон без сноса: максимум уровня выходов каждой связки, замеры через 50 тиков. */
function peakSinks(seed: number, placements: Placement[], noise: BundleScenario['noise'], ticks: number): number[] {
  const { state, ledger, resolved } = bundleWorld(seed, placements, noise);
  const peaks = resolved.map(() => 0);
  for (let t = 0; t < ticks; t += 50) {
    for (let i = 0; i < 50; i++) tick(state, []);
    resolved.forEach((r, i) => void (peaks[i] = Math.max(peaks[i]!, sinkLevel(state, [r]))));
  }
  checkConservation(state, ledger);
  return peaks;
}

describe('связки действительно работают (иначе свойства выше пустые)', () => {
  it('в любом месте и повороте предметы доходят до выходов каждой связки', () => {
    const used = new Set<string>();
    fc.assert(
      fc.property(fc.integer(), placementsArb, (seed, placements) => {
        placements.forEach((p) => used.add(BUNDLES[p.bundle]!.name));
        const peaks = peakSinks(seed, placements, [], 2000);
        peaks.forEach((peak, i) => expect(peak, `${BUNDLES[placements[i]!.bundle]!.name}, поворот ${placements[i]!.rot}`).toBeGreaterThan(0));
      }),
      { numRuns: 20 },
    );
    expect(used.size).toBe(BUNDLES.length);
  }, 60_000);

  it('в заметной доле случайных прогонов предметы доходят до выходов, несмотря на снос и достройку', () => {
    let runs = 0;
    let moved = 0;
    let movedAfterChaos = 0;
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const { state, ledger, resolved } = bundleWorld(seed, placements, noise);
        let peak = 0;
        let changed = false;
        let base = 0;
        steps.forEach((step, i) => {
          applyStep(state, ledger, step);
          const level = sinkLevel(state, resolved);
          peak = Math.max(peak, level);
          if (i === 0) base = level;
          else if (level !== base) changed = true;
        });
        runs += 1;
        if (peak > 0) moved += 1;
        if (changed) movedAfterChaos += 1;
      }),
      { numRuns: 40, seed: 20261121 },
    );
    expect(runs).toBe(40);
    // Выходы связок получили предметы почти всегда, и содержимое выходов менялось и после первого случайного шага.
    expect(moved / runs).toBeGreaterThan(0.8);
    expect(movedAfterChaos / runs).toBeGreaterThan(0.4);
  }, 60_000);
});

describe('поворот связок', () => {
  it.each(BUNDLES.map((b, i) => [b.name, i] as const))('здания связки не пересекаются и остаются на карте при любом повороте: %s', (_name, bundle) => {
    for (const rot of [0, 1, 2, 3]) {
      const cells = cellsOf(resolve({ bundle, rot, x: 0, y: 0 }));
      expect(new Set(cells).size).toBe(cells.length);
      expect(cells.every((c) => c.split(',').every((n) => Number(n) >= 0))).toBe(true);
    }
  });
});
