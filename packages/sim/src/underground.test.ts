import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { takeFrom } from './transfer';
import {
  BELT_CELL,
  buildingAt,
  canAccept,
  canPlace,
  createState,
  hash,
  pushToBelt,
  tick,
  undergroundPlacement,
  type Command,
  type Dir,
  type PlacedBuilding,
  type SimState,
} from './index';
import { electrify, stocked } from './testKit';

const build = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });
const demolish = (x: number, y: number): Command => ({ type: 'demolish', x, y });
const at = (s: SimState, x: number, y: number): PlacedBuilding => buildingAt(s, x, y)!;
const run = (s: SimState, ticks: number): void => {
  for (let i = 0; i < ticks; i++) tick(s, []);
};
const count = (s: SimState, item: string): number => s.inventory.filter((x) => x.item === item).reduce((n, x) => n + x.count, 0);

/** Лента (2,5) → вход (3,5) → тоннель под (4..6,5) → выход (7,5) → лента (8,5), всё на восток. */
function tunnel(): SimState {
  const s = stocked(createState(1, { width: 16, height: 16 }));
  tick(s, [build('belt', 2, 5), build('undergroundBelt', 3, 5), build('undergroundBelt', 7, 5), build('belt', 8, 5)]);
  return s;
}

describe('подземный конвейер: роли и пары', () => {
  it('первый становится входом, второй позади с ним в пределах дальности — выходом', () => {
    const s = tunnel();
    expect(at(s, 3, 5).underground).toBe('in');
    expect(at(s, 7, 5).underground).toBe('out');
  });

  it('дальше 4 клеток между — второй тоже вход', () => {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('undergroundBelt', 2, 5), build('undergroundBelt', 8, 5)]);
    expect(at(s, 8, 5).underground).toBe('in');
  });

  it('другое направление или тип не сцепляются', () => {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('undergroundBelt', 2, 5), build('undergroundBelt', 4, 5, 3), build('fastUndergroundBelt', 5, 5)]);
    expect(at(s, 4, 5).underground).toBe('in');
    expect(at(s, 5, 5).underground).toBe('in');
  });

  it('вход с парой не сцепляется со следующим', () => {
    const s = tunnel();
    tick(s, [build('undergroundBelt', 9, 5)]);
    expect(at(s, 9, 5).underground).toBe('in');
  });

  it('undergroundPlacement предсказывает роль и пару для призрака', () => {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('undergroundBelt', 2, 5)]);
    const inId = at(s, 2, 5).id;
    expect(undergroundPlacement(s, 'undergroundBelt', 6, 5, 1)).toEqual({ role: 'out', partner: inId });
    expect(undergroundPlacement(s, 'undergroundBelt', 8, 5, 1)).toEqual({ role: 'in', partner: null });
  });

  it('клетки пролёта свободны для зданий, но не для подземного того же типа и направления', () => {
    const s = tunnel();
    expect(canPlace(s, 'chest', 5, 5, 0)).toBe(true);
    expect(canPlace(s, 'undergroundBelt', 5, 5, 3)).toBe(true);
    expect(canPlace(s, 'fastUndergroundBelt', 5, 5, 1)).toBe(true);
    expect(canPlace(s, 'undergroundBelt', 5, 5, 1)).toBe(false);
  });
});

describe('подземный конвейер: перенос', () => {
  it('предметы проходят тоннель и выходят на ленту за выходом', () => {
    const s = tunnel();
    tick(s, [build('chest', 5, 5, 0)]);
    pushToBelt(at(s, 2, 5), 'ironPlate');
    // 6 клеток пути при скорости 8: 192 тика; с запасом.
    run(s, 6 * (BELT_CELL / 8) + 10);
    expect((at(s, 8, 5).belt ?? []).map((it) => it.item)).toEqual(['ironPlate']);
  });

  it('пропускная способность как у ленты', () => {
    const s = tunnel();
    const beltOnly = stocked(createState(1, { width: 16, height: 16 }));
    tick(beltOnly, [2, 3, 4, 5, 6, 7, 8].map((x) => build('belt', x, 5)));
    let a = 0;
    let b = 0;
    for (let t = 0; t < 1200; t++) {
      pushToBelt(at(s, 2, 5), 'coal');
      pushToBelt(at(beltOnly, 2, 5), 'coal');
      tick(s, []);
      tick(beltOnly, []);
      a += (at(s, 8, 5).belt ?? []).filter((it) => it.pos >= BELT_CELL - 8).length;
      b += (at(beltOnly, 8, 5).belt ?? []).filter((it) => it.pos >= BELT_CELL - 8).length;
    }
    expect(a).toBe(b);
  });

  it('вход без пары — тупик: предметы стоят в конце клетки', () => {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('undergroundBelt', 3, 5)]);
    pushToBelt(at(s, 3, 5), 'ironPlate');
    run(s, 200);
    expect(at(s, 3, 5).belt).toEqual([{ item: 'ironPlate', pos: BELT_CELL }]);
  });

  it('вход принимает ленту только сзади, выход — ни с какой стороны', () => {
    const s = tunnel();
    tick(s, [build('belt', 3, 6, 0), build('belt', 6, 5, 1)]);
    pushToBelt(at(s, 3, 6), 'coal');
    run(s, 100);
    expect(at(s, 3, 6).belt?.length).toBe(1);
    expect(at(s, 3, 5).belt ?? []).toEqual([]);
    pushToBelt(at(s, 6, 5), 'coal');
    run(s, 100);
    expect(at(s, 6, 5).belt?.length).toBe(1);
  });

  it('манипулятор кладёт во вход и выход, а из входа не берёт предметы тоннеля', () => {
    const s = tunnel();
    expect(canAccept(at(s, 3, 5), 'coal', buildings)).toBe(true);
    expect(canAccept(at(s, 7, 5), 'coal', buildings)).toBe(true);
    at(s, 3, 5).belt = [{ item: 'coal', pos: BELT_CELL + 100 }];
    expect(takeFrom(at(s, 3, 5), () => true, buildings)).toBeNull();
    at(s, 3, 5).belt = [{ item: 'coal', pos: 100 }];
    expect(takeFrom(at(s, 3, 5), () => true, buildings)).toBe('coal');
  });
});

describe('подземный конвейер: манипулятор у входа', () => {
  /** Тоннель из tunnel() плюс манипулятор над входом: берёт из (3,5) и кладёт на север, в сундук (3,3). */
  function withInserter(): SimState {
    const s = tunnel();
    tick(s, [build('inserter', 3, 4, 0), build('chest', 3, 3)]);
    electrify(s);
    return s;
  }

  it('предмет на поверхности входа манипулятор берёт в сундук', () => {
    const s = withInserter();
    expect(at(s, 3, 5).underground).toBe('in');
    expect(at(s, 7, 5).underground).toBe('out');
    at(s, 3, 5).belt = [{ item: 'coal', pos: 0 }];
    run(s, 100);
    expect(at(s, 3, 3).slots).toEqual([{ item: 'coal', count: 1 }]);
    expect(at(s, 3, 5).belt ?? []).toEqual([]);
  });

  it('предмет в тоннеле (pos > BELT_CELL) манипулятор не берёт и пока он под землёй', () => {
    const s = withInserter();
    at(s, 3, 5).belt = [{ item: 'coal', pos: BELT_CELL + 100 }];
    for (let i = 0; i < 20; i++) {
      tick(s, []);
      const held = at(s, 3, 5).belt!;
      expect(held).toHaveLength(1);
      expect(held[0]!.pos).toBeGreaterThan(BELT_CELL);
      expect(at(s, 3, 3).slots ?? []).toEqual([]);
      expect(at(s, 3, 4).output).toBeNull();
    }
  });
});

describe('подземный конвейер: снос и хеш', () => {
  /** Тоннель, в котором два предмета под землёй. */
  function loaded(): SimState {
    const s = tunnel();
    tick(s, [demolish(8, 5)]);
    pushToBelt(at(s, 3, 5), 'ironPlate');
    run(s, 40);
    pushToBelt(at(s, 3, 5), 'copperPlate');
    run(s, 40);
    expect(at(s, 3, 5).belt!.filter((it) => it.pos > BELT_CELL).length).toBe(2);
    return s;
  }

  it('снос выхода возвращает предметы тоннеля, вход становится тупиком', () => {
    const s = loaded();
    const before = count(s, 'ironPlate') + count(s, 'copperPlate');
    tick(s, [demolish(7, 5)]);
    expect(buildingAt(s, 7, 5)).toBeNull();
    expect(count(s, 'ironPlate') + count(s, 'copperPlate')).toBe(before + 2);
    expect(at(s, 3, 5).belt ?? []).toEqual([]);
  });

  it('снос входа возвращает и тоннель', () => {
    const s = loaded();
    const before = count(s, 'ironPlate') + count(s, 'copperPlate');
    tick(s, [demolish(3, 5)]);
    expect(count(s, 'ironPlate') + count(s, 'copperPlate')).toBe(before + 2);
  });

  it('роль входит в хеш, повтор даёт тот же хеш', () => {
    expect(hash(tunnel())).toBe(hash(tunnel()));
    const s = tunnel();
    const t = tunnel();
    at(t, 7, 5).underground = 'in';
    expect(hash(s)).not.toBe(hash(t));
  });
});

describe('разделитель перед подземным (TASK-58)', () => {
  it('разделитель отдаёт на вход подземного, смотрящий от него, и не отдаёт на выход', () => {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    // Разделитель (5,5) на восток; вперёд — вход подземного (6,5) с выходом (8,5);
    // слева (5,4) — выход пары (3,4) → (5,4), смотрит на восток; справа (5,6) — вход, смотрящий не от разделителя.
    tick(s, [
      build('splitter', 5, 5),
      build('undergroundBelt', 6, 5),
      build('undergroundBelt', 8, 5),
      build('undergroundBelt', 3, 4),
      build('undergroundBelt', 5, 4),
      build('undergroundBelt', 5, 6),
    ]);
    expect(at(s, 5, 4).underground).toBe('out');
    expect(at(s, 5, 6).underground).toBe('in');
    for (let i = 0; i < 4; i++) {
      at(s, 5, 5).belt = [{ item: 'coal', pos: BELT_CELL / 2 }];
      run(s, 40);
    }
    expect((at(s, 6, 5).belt ?? []).length + (at(s, 8, 5).belt ?? []).length).toBeGreaterThan(0);
    expect(at(s, 5, 4).belt ?? []).toEqual([]);
    expect(at(s, 5, 6).belt ?? []).toEqual([]);
  });
});
