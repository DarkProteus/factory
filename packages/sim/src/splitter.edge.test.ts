import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL } from './belt';
import { buildingAt, placeBuilding, type Dir, type PlacedBuilding } from './buildings';
import { feedsSplitter, isSplitter, runSplitter, setFilter, splitterNextOutput, splitterOutputs } from './splitter';
import { createState, type SimState } from './state';
import { stocked } from './testKit';

const at = (s: SimState, x: number, y: number): PlacedBuilding => buildingAt(s, x, y)!;
const field = (): SimState => stocked(createState(1, { width: 16, height: 16 }));
const put = (s: SimState, type: string, x: number, y: number, dir: Dir): PlacedBuilding => {
  placeBuilding(s, type, x, y, dir);
  return at(s, x, y);
};

/** Разделитель (5,5) на восток: выходы вперёд (6,5), влево (5,4), вправо (5,6). */
const CELLS: [number, number, Dir][] = [[6, 5, 1], [5, 4, 0], [5, 6, 2]];

describe('splitterOutputs: что считается выходом', () => {
  it('feedsSplitter: лента принимается только того же направления', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    expect(feedsSplitter({ dir: 1 } as PlacedBuilding, sp)).toBe(true);
    expect(feedsSplitter({ dir: 3 } as PlacedBuilding, sp)).toBe(false);
  });

  it('пустые клетки и здания не-конвейеры — не выходы', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
    put(s, 'chest', 6, 5, 0);
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
  });

  it('конвейер: любое направление, кроме смотрящего на разделитель', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const f = put(s, 'belt', 6, 5, 0);
    const l = put(s, 'belt', 5, 4, 3);
    const r = put(s, 'belt', 5, 6, 1);
    expect(splitterOutputs(s, sp, buildings)).toEqual([f, l, r]);
    f.dir = 3;
    l.dir = 2;
    r.dir = 0;
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
  });

  it('вход подземного — выход, если смотрит от разделителя; иное направление и выход подземного — нет', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const units = CELLS.map(([x, y, d]) => put(s, 'undergroundBelt', x, y, d));
    expect(splitterOutputs(s, sp, buildings)).toEqual(units);
    // Роль выхода: не принимает ни с какой стороны.
    for (const u of units) u.underground = 'out';
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
    // Вход, но смотрит не от разделителя.
    units[0]!.underground = 'in';
    units[0]!.dir = 0;
    units[1]!.underground = 'in';
    units[1]!.dir = 1;
    units[2]!.underground = 'in';
    units[2]!.dir = 3;
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
  });

  it('соседний разделитель — выход, если смотрит в сторону выхода', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const sps = CELLS.map(([x, y, d]) => put(s, 'splitter', x, y, d));
    expect(splitterOutputs(s, sp, buildings)).toEqual(sps);
    for (const n of sps) n.dir = ((n.dir + 1) % 4) as Dir;
    expect(splitterOutputs(s, sp, buildings)).toEqual([null, null, null]);
  });

  it('фильтрующий разделитель-сосед тоже выход', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const f = put(s, 'filterSplitter', 6, 5, 1);
    expect(splitterOutputs(s, sp, buildings)).toEqual([f, null, null]);
  });
});

describe('runSplitter: круг и фильтр', () => {
  /** Разделитель с тремя конвейерами-выходами и одним предметом в буфере. */
  function rig(item: string, progress: number, filter?: string) {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const outs = CELLS.map(([x, y, d]) => put(s, 'belt', x, y, d));
    sp.belt = [{ item, pos: BELT_CELL / 2 }];
    sp.progress = progress;
    if (filter !== undefined) sp.filter = filter;
    return { s, sp, outs };
  }
  const where = (outs: PlacedBuilding[]): number => outs.findIndex((o) => (o.belt ?? []).length > 0);

  it('круг: 0 → 1 → 2 → 0 при свободных выходах', () => {
    for (const [progress, out, next] of [[0, 0, 1], [1, 1, 2], [2, 2, 0]] as const) {
      const { sp, outs } = rig('coal', progress);
      runSplitter(sp, outs, buildings);
      expect(where(outs)).toBe(out);
      expect(sp.belt).toEqual([]);
      expect(sp.progress).toBe(next);
    }
  });

  it('занятый или отсутствующий выход по кругу пропускается с переходом через конец', () => {
    const { sp, outs } = rig('coal', 2);
    runSplitter(sp, [outs[0]!, outs[1]!, null], buildings);
    expect(where(outs)).toBe(0);
    expect(sp.progress).toBe(1);
  });

  it('предмет остаётся в буфере, пока нет ни одного выхода', () => {
    const { sp } = rig('coal', 1);
    runSplitter(sp, [null, null, null], buildings);
    expect(sp.belt).toHaveLength(1);
    expect(sp.progress).toBe(1);
  });

  it('пустой или отсутствующий буфер — ничего не делает', () => {
    const { sp, outs } = rig('coal', 1);
    sp.belt = [];
    runSplitter(sp, outs, buildings);
    expect(where(outs)).toBe(-1);
    delete sp.belt;
    runSplitter(sp, outs, buildings);
    expect(where(outs)).toBe(-1);
    expect(sp.progress).toBe(1);
  });

  it('предмет-фильтр идёт вперёд и круг не сдвигает; ждёт, если впереди нет выхода', () => {
    const { sp, outs } = rig('ironOre', 2, 'ironOre');
    runSplitter(sp, [null, outs[1]!, outs[2]!], buildings);
    expect(sp.belt).toHaveLength(1);
    expect(sp.progress).toBe(2);
    runSplitter(sp, outs, buildings);
    expect(where(outs)).toBe(0);
    expect(sp.progress).toBe(2);
  });

  it('боковые при фильтре сдвигают круг и обходят выход вперёд', () => {
    for (const [progress, out, next] of [[0, 1, 2], [1, 1, 2], [2, 2, 0]] as const) {
      const { sp, outs } = rig('coal', progress, 'ironOre');
      runSplitter(sp, outs, buildings);
      expect(where(outs)).toBe(out);
      expect(sp.progress).toBe(next);
    }
  });

  it('боковые при фильтре: с 2 и без правого выхода круг переходит на левый', () => {
    const { sp, outs } = rig('coal', 2, 'ironOre');
    runSplitter(sp, [outs[0]!, outs[1]!, null], buildings);
    expect(where(outs)).toBe(1);
    expect(sp.progress).toBe(2);
  });

  it('выход-разделитель принимает один предмет в середину буфера и не принимает, если занят', () => {
    const s = field();
    const sp = put(s, 'splitter', 5, 5, 1);
    const next = put(s, 'splitter', 6, 5, 1);
    sp.belt = [{ item: 'coal', pos: BELT_CELL / 2 }];
    sp.progress = 0;
    runSplitter(sp, [next, null, null], buildings);
    expect(sp.belt).toEqual([]);
    expect(next.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
    expect(sp.progress).toBe(1);
    sp.belt = [{ item: 'ironOre', pos: BELT_CELL / 2 }];
    sp.progress = 0;
    runSplitter(sp, [next, null, null], buildings);
    expect(sp.belt).toHaveLength(1);
    expect(next.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
    // Пустой массив буфера соседа тоже означает «свободно».
    next.belt = [];
    runSplitter(sp, [next, null, null], buildings);
    expect(next.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL / 2 }]);
  });
});

describe('splitterNextOutput: граница круга', () => {
  it('без подходящего индекса в допустимых выходах начинает с первого', () => {
    expect(splitterNextOutput({ progress: 2, filter: 'coal' }, 'coal')).toBe(0);
    expect(splitterNextOutput({ progress: 1, filter: 'coal' }, 'coal')).toBe(0);
    expect(splitterNextOutput({ progress: 0, filter: 'coal' }, 'coal')).toBe(0);
  });

  it('первый допустимый не меньше прогресса', () => {
    expect(splitterNextOutput({ progress: 1, filter: undefined }, 'coal')).toBe(1);
    expect(splitterNextOutput({ progress: 0, filter: 'coal' }, 'ironOre')).toBe(1);
  });
});

describe('isSplitter и setFilter', () => {
  it('isSplitter: оба вида разделителей да, остальные и неизвестные типы нет', () => {
    expect(isSplitter({ type: 'splitter' } as PlacedBuilding, buildings)).toBe(true);
    expect(isSplitter({ type: 'filterSplitter' } as PlacedBuilding, buildings)).toBe(true);
    expect(isSplitter({ type: 'belt' } as PlacedBuilding, buildings)).toBe(false);
    expect(isSplitter({ type: 'nope' } as PlacedBuilding, buildings)).toBe(false);
  });

  it('setFilter: тип здания, которого нет в переданных defs, молча игнорируется', () => {
    const s = field();
    const f = put(s, 'filterSplitter', 5, 5, 1);
    setFilter(s, f.id, 'coal', {});
    expect(f.filter).toBeUndefined();
    setFilter(s, f.id, 'coal', buildings);
    expect(f.filter).toBe('coal');
  });
});
