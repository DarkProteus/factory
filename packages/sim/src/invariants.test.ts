import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hash } from './hash';
import { applyStep, checkConservation, checkInventory, checkOccupancy, FACTORY_PREFIX, mapArb, newWorld, stepArb, type Step } from './propKit';

// Число прогонов ограничено: сценарий до 40 шагов по ≤400 тиков, весь файл укладывается в несколько секунд.
const params = { numRuns: 40 };
const scenario = (prefix: readonly Step[]) =>
  fc
    .record({ seed: fc.integer(), map: mapArb, steps: fc.array(stepArb, { maxLength: 40 }) })
    .map((s) => ({ ...s, steps: [...prefix, ...s.steps] }));

const isDemolish = (step: Step): boolean => step.kind === 'cmd' && step.command.type === 'demolish';

describe('инварианты sim (property-based)', () => {
  it.each([
    ['случайные команды', []],
    ['с готовой линией бур-печь-манипулятор-сундук', FACTORY_PREFIX],
  ] as const)('занятость карты и инвентарь согласованы после каждого шага: %s', (_name, prefix) => {
    fc.assert(
      fc.property(scenario(prefix), ({ seed, map, steps }) => {
        const { state, ledger } = newWorld(seed, map);
        for (const step of steps) {
          applyStep(state, ledger, step);
          checkOccupancy(state);
          checkInventory(state);
        }
      }),
      params,
    );
    // Property-тест: до 40 прогонов по ≤40 шагам; 0,3–1 с в покое, под нагрузкой выходит за 5 с (TASK-65).
  }, 30_000);

  it('снос: либо здание удалено и клетки свободны, либо ничего не изменилось', () => {
    fc.assert(
      fc.property(scenario(FACTORY_PREFIX), ({ seed, map, steps }) => {
        const { state, ledger } = newWorld(seed, map);
        for (const step of steps) {
          const before = isDemolish(step) ? JSON.stringify(state.inventory) : null;
          const demolished = applyStep(state, ledger, step);
          // Отказ допустим (полный инвентарь или пустая клетка): тогда инвентарь не менялся.
          if (isDemolish(step) && !demolished) expect(JSON.stringify(state.inventory)).toBe(before);
          checkOccupancy(state);
        }
      }),
      params,
    );
    // Property-тест: до 40 прогонов по ≤40 шагам; 0,3–1 с в покое, под нагрузкой выходит за 5 с (TASK-65).
  }, 30_000);

  it('одно зерно и одна последовательность дают один хеш на каждом шаге (два прогона)', () => {
    fc.assert(
      fc.property(scenario(FACTORY_PREFIX), ({ seed, map, steps }) => {
        const a = newWorld(seed, map);
        const b = newWorld(seed, map);
        for (const step of steps) {
          applyStep(a.state, a.ledger, step);
          applyStep(b.state, b.ledger, step);
          expect(hash(a.state)).toBe(hash(b.state));
        }
      }),
      params,
    );
    // Property-тест: до 40 прогонов по ≤40 шагам; 0,3–1 с в покое, под нагрузкой выходит за 5 с (TASK-65).
  }, 30_000);

  it.each([
    ['пустой инвентарь', false],
    ['почти полный инвентарь (снос иногда запрещён)', true],
  ] as const)('сохранение предметов: добытая руда = предметы в зданиях и инвентаре + цикл печи + потерянное сносом: %s', (_name, full) => {
    fc.assert(
      fc.property(scenario(FACTORY_PREFIX), ({ seed, map, steps }) => {
        const { state, ledger } = newWorld(seed, map, full);
        for (const step of steps) {
          applyStep(state, ledger, step);
          checkConservation(state, ledger);
          checkInventory(state);
        }
      }),
      params,
    );
    // Property-тест: до 40 прогонов по ≤40 шагам; 0,3–1 с в покое, под нагрузкой выходит за 5 с (TASK-65).
  }, 30_000);
});
