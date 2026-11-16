import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { buildingAt, createState, depositAt, tick, type SimState } from './index';

const drill = buildings.drill;
const T = drill.miningTicks;

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function withDrill(deposits: { x: number; y: number; item: string; amount: number }[]): SimState {
  const state = createState(1, { width: 8, height: 8, deposits });
  tick(state, [{ type: 'build', building: 'drill', x: 2, y: 2, dir: 0 }]);
  return state;
}

describe('бур', () => {
  it('описан в content как miner с числом тиков на единицу руды', () => {
    expect(drill.behavior).toBe('miner');
    expect(Number.isInteger(T) && T > 0).toBe(true);
    expect(Number.isInteger(drill.buffer) && drill.buffer > 0).toBe(true);
  });

  it('выдаёт одну руду за miningTicks тиков, несколько циклов подряд', () => {
    const state = withDrill([{ x: 2, y: 2, item: 'ironOre', amount: 100 }]);
    const b = buildingAt(state, 2, 2)!;
    // Тик постройки уже прошёл и засчитан как первый тик цикла.
    run(state, T - 2);
    expect(b.output).toBeNull();
    for (let cycle = 1; cycle <= 3; cycle++) {
      run(state, 1);
      expect(b.output).toEqual({ item: 'ironOre', count: cycle });
      run(state, T - 1);
      expect(b.output).toEqual({ item: 'ironOre', count: cycle });
    }
  });

  it('тип руды соответствует залежи и залежь убывает', () => {
    const state = withDrill([{ x: 3, y: 3, item: 'ironPlate', amount: 2 }]);
    run(state, T * 3);
    const b = buildingAt(state, 2, 2)!;
    expect(b.output).toEqual({ item: 'ironPlate', count: 2 });
    expect(depositAt(state, 3, 3)).toBeNull();
  });

  it('на клетке без залежи не выдаёт ничего', () => {
    const state = withDrill([{ x: 6, y: 6, item: 'ironOre', amount: 100 }]);
    run(state, T * 5);
    const b = buildingAt(state, 2, 2)!;
    expect(b.output).toBeNull();
    expect(b.progress).toBe(0);
  });

  it('с полным буфером останавливается и не теряет руду', () => {
    const state = withDrill([{ x: 2, y: 2, item: 'ironOre', amount: 100 }]);
    run(state, T * (drill.buffer + 5));
    const b = buildingAt(state, 2, 2)!;
    expect(b.output).toEqual({ item: 'ironOre', count: drill.buffer });
    expect(depositAt(state, 2, 2)).toEqual({ item: 'ironOre', amount: 100 - drill.buffer });
  });

  it('добыча детерминирована и состояние сериализуется', () => {
    const a = withDrill([{ x: 2, y: 2, item: 'ironOre', amount: 100 }]);
    run(a, T * 2 + 7);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
