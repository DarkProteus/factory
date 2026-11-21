import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL } from './belt';
import { buildingAt, placeBuilding, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import { runBelts } from './segments';
import { createState, type SimState } from './state';
import { give, stocked } from './testKit';

const SPEED = buildings.belt.beltSpeed!;
const at = (s: SimState, x: number, y: number): PlacedBuilding => buildingAt(s, x, y)!;
const field = (): SimState => stocked(createState(1, { width: 16, height: 16 }));
const put = (s: SimState, cells: [number, number, Dir][]): void => {
  for (const [x, y, dir] of cells) placeBuilding(s, 'belt', x, y, dir);
};

describe('сегменты: порядок обхода', () => {
  it('каждый конвейер цепочки обрабатывается за проход ровно один раз', () => {
    const s = field();
    put(s, [[3, 5, 1], [4, 5, 1], [5, 5, 1], [6, 5, 1]]);
    for (const x of [3, 4, 5, 6]) at(s, x, 5).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, buildings);
    for (const x of [3, 4, 5, 6]) expect(at(s, x, 5).belt![0]!.pos).toBe(SPEED);
  });

  it('в кольце каждый конвейер тоже обрабатывается один раз', () => {
    const s = field();
    put(s, [[3, 3, 1], [4, 3, 2], [4, 4, 3], [3, 4, 0]]);
    for (const [x, y] of [[3, 3], [4, 3], [4, 4], [3, 4]] as const) at(s, x, y).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, buildings);
    for (const [x, y] of [[3, 3], [4, 3], [4, 4], [3, 4]] as const) expect(at(s, x, y).belt![0]!.pos).toBe(SPEED);
  });

  it('ветвление: два конвейера в один обрабатываются по разу, предмет не теряется и не двоится', () => {
    const s = field();
    // (3,5) → (4,5) ← (4,4); у (4,5) один хвост, два притока.
    put(s, [[3, 5, 1], [4, 4, 2], [4, 5, 1], [5, 5, 1]]);
    at(s, 3, 5).belt = [{ item: 'coal', pos: BELT_CELL - 1 }];
    at(s, 4, 4).belt = [{ item: 'ironOre', pos: 0 }];
    runBelts(s, buildings);
    expect(at(s, 4, 4).belt![0]!.pos).toBe(SPEED);
    expect(at(s, 4, 5).belt!.map((it) => it.item)).toEqual(['coal']);
    const total = [3, 4, 5].reduce((n, x) => n + (at(s, x, 5).belt ?? []).length, 0);
    expect(total).toBe(1);
  });
});

describe('сегменты: защита от самоссылки', () => {
  /** Конвейер 2×1: клетка перед его «головой» принадлежит ему же. */
  const wide: BuildingDefs = { ...buildings, wideBelt: { size: [2, 1], behavior: 'belt', hp: 50, beltSpeed: SPEED } as BuildingDef };

  it('многоклеточный конвейер не передаёт предметы сам себе', () => {
    const s = field();
    give(s, 'wideBelt', 1);
    placeBuilding(s, 'wideBelt', 3, 5, 1, wide);
    // dir 1: отпечаток 1×2 по высоте; клетка справа от (3,5) — свободна, но снизу — часть здания.
    const b = at(s, 3, 5);
    expect(buildingAt(s, 3, 6)).toBe(b);
    b.dir = 2;
    b.belt = [{ item: 'coal', pos: BELT_CELL }];
    runBelts(s, wide);
    expect(b.belt).toEqual([{ item: 'coal', pos: BELT_CELL }]);
  });
});

describe('сегменты: узлы, кеш и разделители', () => {
  it('ветвление: ниже по течению каждый конвейер обрабатывается один раз', () => {
    const s = field();
    put(s, [[3, 5, 1], [4, 4, 2], [4, 5, 1], [5, 5, 1]]);
    at(s, 4, 5).belt = [{ item: 'coal', pos: 0 }];
    at(s, 5, 5).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, buildings);
    expect(at(s, 4, 5).belt![0]!.pos).toBe(SPEED);
    expect(at(s, 5, 5).belt![0]!.pos).toBe(SPEED);
  });

  it('не-конвейеры не становятся узлами: у сундука не появляется лента', () => {
    const s = field();
    put(s, [[3, 5, 1]]);
    placeBuilding(s, 'chest', 4, 5, 0);
    runBelts(s, buildings);
    expect(at(s, 4, 5).belt).toBeUndefined();
  });

  it('кеш сегментов: новая стройка и смена defs учитываются', () => {
    const s = field();
    put(s, [[3, 5, 1]]);
    at(s, 3, 5).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, buildings);
    put(s, [[3, 7, 1]]);
    at(s, 3, 7).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, buildings);
    expect(at(s, 3, 7).belt![0]!.pos).toBe(SPEED);
    const fast: BuildingDefs = { ...buildings, belt: { ...buildings.belt, beltSpeed: SPEED * 2 } as BuildingDef };
    at(s, 3, 7).belt = [{ item: 'coal', pos: 0 }];
    runBelts(s, fast);
    expect(at(s, 3, 7).belt![0]!.pos).toBe(SPEED * 2);
  });

  it('разделитель обрабатывается после своих выходов: переданный предмет не едет в тот же тик', () => {
    const s = field();
    // Разделитель ставится раньше выходной ленты, то есть у него меньший id.
    placeBuilding(s, 'splitter', 5, 5, 1);
    put(s, [[6, 5, 1], [7, 5, 1]]);
    const sp = at(s, 5, 5);
    sp.belt = [{ item: 'coal', pos: BELT_CELL / 2 }];
    sp.progress = 0;
    runBelts(s, buildings);
    expect(sp.belt).toEqual([]);
    expect(at(s, 6, 5).belt).toEqual([{ item: 'coal', pos: 0 }]);
  });

  it('конвейер перед разделителем кладёт головной предмет в его буфер и ждёт, пока тот занят', () => {
    const s = field();
    put(s, [[4, 5, 1]]);
    placeBuilding(s, 'splitter', 5, 5, 1);
    const belt = at(s, 4, 5);
    belt.belt = [{ item: 'coal', pos: BELT_CELL }, { item: 'ironOre', pos: BELT_CELL - 64 }];
    runBelts(s, buildings);
    expect(at(s, 5, 5).belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
    expect(belt.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL - 64 }]);
    // Буфер разделителя занят: следующий предмет подъезжает к концу клетки, но не входит.
    for (let k = 0; k < 20; k++) runBelts(s, buildings);
    expect(at(s, 5, 5).belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
    expect(belt.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL }]);
  });
});
