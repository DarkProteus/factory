import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hash, tick } from '@factory/sim';
// Миры из связок лежат в sim как тестовые данные и не входят в публичный index пакета (как и propKit).
import { bundleScenarioArb, bundleWorld } from '../../sim/src/propBundles';
import { applyStep } from '../../sim/src/propKit';
import { deserialize, serialize } from './index';

// Прогонов немного: каждый мир сначала живёт до нескольких тысяч тиков (как в sim/invariants.bundles.test.ts).
// Для длинного поиска багов поднять numRuns (например, до 300) и таймаут.
const params = { numRuns: 12 };
const AFTER = 200;
const CHECK_EVERY = 20;

describe('сохранение и загрузка (property-based, миры из связок)', () => {
  it('загруженный мир имеет тот же хеш, проходит проверку сейва и 200 тиков идёт в ногу с исходным', () => {
    fc.assert(
      fc.property(bundleScenarioArb, ({ seed, placements, noise, steps }) => {
        const { state, ledger } = bundleWorld(seed, placements, noise);
        for (const step of steps) applyStep(state, ledger, step);

        const text = serialize(state);
        // deserialize сам проверяет сейв (validateState) и бросает SaveError на любом нарушении.
        const loaded = deserialize(text);
        expect(hash(loaded)).toBe(hash(state));
        // Повторное сохранение загруженного мира даёт тот же текст: формат устойчив.
        expect(serialize(loaded)).toBe(text);

        for (let t = 1; t <= AFTER; t++) {
          tick(state, []);
          tick(loaded, []);
          if (t % CHECK_EVERY === 0) expect(hash(loaded), `тик ${t} после загрузки`).toBe(hash(state));
        }
      }),
      params,
    );
  }, 60_000);
});
