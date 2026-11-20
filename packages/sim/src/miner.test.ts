import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { buildingAt, createState, depositAt, tick, type Command, type Dir, type SimState } from './index';
import { stocked } from './testKit';

const drill = buildings.drill;
const T = drill.miningTicks;

function run(state: SimState, ticks: number): void {
  for (let i = 0; i < ticks; i++) tick(state, []);
}

function withDrill(deposits: { x: number; y: number; item: string; amount: number }[]): SimState {
  const state = stocked(createState(1, { width: 8, height: 8, deposits }));
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
    expect(depositAt(state, 2, 2)).toEqual({ item: 'ironOre', amount: 100 - drill.buffer, initial: 100 });
  });

  it('добыча детерминирована и состояние сериализуется', () => {
    const a = withDrill([{ x: 2, y: 2, item: 'ironOre', amount: 100 }]);
    run(a, T * 2 + 7);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  describe('выкладка перед собой', () => {
    const ore = [{ x: 2, y: 2, item: 'ironOre', amount: 100 }];

    /** Бур (2,2) смотрит на восток: клетка выдачи (4,2). Здания перед ним ставятся командами. */
    function drillWith(cmds: Command[], dir: Dir = 1): SimState {
      const state = stocked(createState(1, { width: 8, height: 8, deposits: ore }));
      tick(state, [{ type: 'build', building: 'drill', x: 2, y: 2, dir }, ...cmds]);
      return state;
    }
    const put = (building: string, x: number, y: number, dir: Dir = 1): Command => ({
      type: 'build',
      building,
      x,
      y,
      dir,
    });

    it('кладёт руду на конвейер перед собой, пока есть зазор', () => {
      const state = drillWith([put('belt', 4, 2, 0)]);
      run(state, T - 1);
      expect(buildingAt(state, 4, 2)!.belt).toHaveLength(1);
      expect(buildingAt(state, 4, 2)!.belt![0]!.item).toBe('ironOre');
      expect(buildingAt(state, 2, 2)!.output).toBeNull();
    });

    it('кладёт руду в здание перед собой, если оно принимает (печь, сундук)', () => {
      const withChest = drillWith([put('chest', 4, 2)]);
      run(withChest, T * 2 - 1);
      expect(buildingAt(withChest, 4, 2)!.slots).toEqual([{ item: 'ironOre', count: 2 }]);
      expect(buildingAt(withChest, 2, 2)!.output).toBeNull();

      const withFurnace = drillWith([put('furnace', 4, 2)]);
      run(withFurnace, T - 1);
      // Печь сразу списывает руду в цикл плавки: принятая руда видна по прогрессу.
      expect(buildingAt(withFurnace, 4, 2)!.progress).toBeGreaterThan(0);
      expect(buildingAt(withFurnace, 2, 2)!.output).toBeNull();
    });

    it('клетка выдачи зависит от направления и размера', () => {
      // N: над левым верхним углом, W: слева от него, S: под первой клеткой нижнего края.
      for (const [dir, x, y] of [[0, 2, 1], [3, 1, 2], [2, 2, 4]] as const) {
        const state = drillWith([put('chest', x, y)], dir);
        run(state, T - 1);
        expect(buildingAt(state, x, y)!.slots).toEqual([{ item: 'ironOre', count: 1 }]);
      }
      // Вторая клетка переднего края не считается целью.
      const state = drillWith([put('chest', 4, 3)]);
      run(state, T - 1);
      expect(buildingAt(state, 2, 2)!.output).toEqual({ item: 'ironOre', count: 1 });
    });

    it('без цели или с не принимающей целью копит руду в буфере, при полном буфере добыча стоит', () => {
      const nothing = drillWith([]);
      run(nothing, T * (drill.buffer + 5));
      expect(buildingAt(nothing, 2, 2)!.output).toEqual({ item: 'ironOre', count: drill.buffer });
      expect(depositAt(nothing, 2, 2)).toEqual({ item: 'ironOre', amount: 100 - drill.buffer, initial: 100 });

      // Манипулятор руду не принимает.
      const wrong = drillWith([put('inserter', 4, 2)]);
      run(wrong, T * 2);
      expect(buildingAt(wrong, 2, 2)!.output).toEqual({ item: 'ironOre', count: 2 });

      // Заполненный сундук тоже не принимает.
      const full = drillWith([put('chest', 4, 2)]);
      buildingAt(full, 4, 2)!.slots = Array.from({ length: buildings.chest.slots }, (_, i) => ({
        item: `filler${i}`,
        count: 1,
      }));
      run(full, T * (drill.buffer + 5));
      expect(buildingAt(full, 2, 2)!.output).toEqual({ item: 'ironOre', count: drill.buffer });
      expect(depositAt(full, 2, 2)!.amount).toBe(100 - drill.buffer);
    });

    it('манипулятор по-прежнему берёт руду из буфера бура', () => {
      // Манипулятор забирает слева от бура, цель выкладки (сундук справа) отсутствует.
      const state = stocked(createState(1, { width: 8, height: 8, deposits: ore }));
      tick(state, [put('drill', 2, 2, 1), put('inserter', 4, 2, 1), put('chest', 5, 2)]);
      run(state, T * 2);
      expect(buildingAt(state, 5, 2)!.slots).toEqual([{ item: 'ironOre', count: 1 }]);
    });
  });
});
