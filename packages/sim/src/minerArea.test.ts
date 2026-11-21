import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { buildingAt, createState, type Dir, type PlacedBuilding, type SimState } from './index';
import { placeBuilding, type BuildingDefs } from './buildings';
import { runMiner } from './miner';
import { POWER_SCALE } from './power';
import { give } from './testKit';

// Бур без энергии: цикл идёт без сети. Тесты зовут runMiner напрямую и проверяют область добычи,
// клетку выдачи, границы буфера и снос выработанной залежи.

const rig = (size: [number, number], extra: Partial<BuildingDef> = {}): BuildingDef =>
  ({ size, behavior: 'miner', hp: 1, miningTicks: 2, buffer: 3, ...extra }) as BuildingDef;

interface Deposit {
  x: number;
  y: number;
  item: string;
  amount: number;
}

interface Setup {
  state: SimState;
  defs: BuildingDefs;
  def: BuildingDef;
  b: PlacedBuilding;
}

/** Бур rig с левым верхним углом (4,4) на карте 12×12; рядом хватает сундуков. */
function setup(def: BuildingDef, deposits: Deposit[], dir: Dir = 0): Setup {
  const state = createState(1, { width: 12, height: 12, deposits });
  const defs: BuildingDefs = { ...buildings, rig: def };
  give(state, 'rig', 1);
  placeBuilding(state, 'rig', 4, 4, dir, defs);
  return { state, defs, def, b: buildingAt(state, 4, 4)! };
}

const cycle = (s: Setup, times: number): void => {
  for (let i = 0; i < times; i++) runMiner(s.state, s.b, s.def, s.defs, undefined);
};

const ore = (x: number, y: number, amount = 50): Deposit => ({ x, y, item: 'ironOre', amount });

describe('бур: область добычи', () => {
  it('добывает из любой клетки отпечатка 2×2', () => {
    for (const [x, y] of [
      [4, 4],
      [5, 4],
      [4, 5],
      [5, 5],
    ]) {
      const s = setup(rig([2, 2]), [ore(x!, y!)]);
      cycle(s, 2);
      expect(s.b.output, `клетка ${x},${y}`).toEqual({ item: 'ironOre', count: 1 });
    }
  });

  it('не добывает из клеток вплотную за отпечатком (справа, снизу, по диагонали)', () => {
    for (const [x, y] of [
      [6, 4],
      [6, 5],
      [4, 6],
      [5, 6],
      [6, 6],
      [3, 4],
      [4, 3],
    ]) {
      const s = setup(rig([2, 2]), [ore(x!, y!)]);
      cycle(s, 6);
      expect(s.b.output, `клетка ${x},${y}`).toBeNull();
      expect(s.state.map.deposits.find((d) => d)?.amount).toBe(50);
    }
  });

  it('прямоугольный бур 3×1: ширина и высота не путаются, при повороте меняются', () => {
    // dir 0: отпечаток 3 в ширину, 1 в высоту — клетки (4..6, 4).
    const wide = setup(rig([3, 1]), [ore(6, 4)]);
    cycle(wide, 2);
    expect(wide.b.output?.count).toBe(1);
    const below = setup(rig([3, 1]), [ore(4, 5)]);
    cycle(below, 6);
    expect(below.b.output).toBeNull();
    // dir 1: отпечаток 1×3 — клетки (4, 4..6).
    const tall = setup(rig([3, 1]), [ore(4, 6)], 1);
    cycle(tall, 2);
    expect(tall.b.output?.count).toBe(1);
    const right = setup(rig([3, 1]), [ore(5, 4)], 1);
    cycle(right, 6);
    expect(right.b.output).toBeNull();
  });

  it('при нескольких залежах берёт первую по строкам: сверху вниз, слева направо', () => {
    const s = setup(rig([2, 2]), [{ x: 4, y: 5, item: 'coal', amount: 9 }, ore(5, 4)]);
    cycle(s, 2);
    expect(s.b.output).toEqual({ item: 'ironOre', count: 1 });
    const t = setup(rig([2, 2]), [{ x: 5, y: 5, item: 'coal', amount: 9 }, { x: 4, y: 5, item: 'copperOre', amount: 9 }]);
    cycle(t, 2);
    expect(t.b.output).toEqual({ item: 'copperOre', count: 1 });
  });
});

describe('бур: цикл добычи', () => {
  it('единица руды появляется ровно на miningTicks-м вызове, прогресс сбрасывается', () => {
    const s = setup(rig([2, 2], { miningTicks: 3 }), [ore(4, 4)]);
    cycle(s, 2);
    expect(s.b.output).toBeNull();
    expect(s.b.progress).toBe(2);
    cycle(s, 1);
    expect(s.b.output?.count).toBe(1);
    expect(s.b.progress).toBe(0);
    expect(s.state.map.deposits[4 * 12 + 4]?.amount).toBe(49);
  });

  it('miningTicks 0 — бур стоит', () => {
    const s = setup(rig([2, 2], { miningTicks: 0 }), [ore(4, 4)]);
    cycle(s, 5);
    expect(s.b.output).toBeNull();
    expect(s.b.progress).toBe(0);
  });

  it('полный буфер останавливает добычу, залежь не тратится', () => {
    const s = setup(rig([2, 2], { buffer: 3 }), [ore(4, 4)]);
    cycle(s, 20);
    expect(s.b.output?.count).toBe(3);
    expect(s.state.map.deposits[4 * 12 + 4]?.amount).toBe(47);
  });

  it('буфер 0: добыча не идёт даже с пустым выходом', () => {
    const s = setup(rig([2, 2], { buffer: 0 }), [ore(4, 4)]);
    cycle(s, 6);
    expect(s.b.output).toBeNull();
    const t = setup(rig([2, 2], { buffer: undefined }), [ore(4, 4)]);
    cycle(t, 6);
    expect(t.b.output).toBeNull();
  });

  it('в буфере другой руды — добыча не идёт', () => {
    const s = setup(rig([2, 2]), [ore(4, 4)]);
    s.b.output = { item: 'coal', count: 1 };
    cycle(s, 6);
    expect(s.b.output).toEqual({ item: 'coal', count: 1 });
    expect(s.state.map.deposits[4 * 12 + 4]?.amount).toBe(50);
  });

  it('последняя единица залежи убирает её с карты', () => {
    const s = setup(rig([2, 2]), [ore(4, 4, 1)]);
    cycle(s, 2);
    expect(s.state.map.deposits[4 * 12 + 4]).toBeNull();
    expect(s.b.output?.count).toBe(1);
    cycle(s, 4);
    expect(s.b.output?.count).toBe(1);
  });

  it('электрический бур вне сети стоит, в сети идёт по удовлетворённости', () => {
    const s = setup(rig([2, 2], { energy: { kind: 'electric', kw: 1 } }), [ore(4, 4)]);
    cycle(s, 4);
    expect(s.b.output).toBeNull();
    for (let i = 0; i < 2; i++) runMiner(s.state, s.b, s.def, s.defs, POWER_SCALE);
    expect(s.b.output?.count).toBe(1);
  });
});

describe('бур: выдача', () => {
  /** Бур в углу (4,4) 2×2; сундуки во всех клетках кольца вокруг, кроме угловых. */
  function ring(dir: Dir, def = rig([2, 2])): Setup {
    const s = setup(def, [ore(4, 4)], dir);
    give(s.state, 'chest', 12);
    const [w, h] = def.size;
    const [fw, fh] = dir === 1 || dir === 3 ? [h, w] : [w, h];
    for (let x = 3; x <= 4 + fw; x++) for (const y of [3, 4 + fh]) placeBuilding(s.state, 'chest', x, y, 0, s.defs);
    for (let y = 4; y < 4 + fh; y++) for (const x of [3, 4 + fw]) placeBuilding(s.state, 'chest', x, y, 0, s.defs);
    return s;
  }

  const chestItems = (s: Setup): string[] =>
    Object.values(s.state.buildings)
      .filter((c) => c.type === 'chest' && (c.slots?.length ?? 0) > 0)
      .map((c) => `${c.x},${c.y}`)
      .sort();

  it('выдаёт в первую клетку переднего края: N (x,y-1), E (x+w,y), S (x,y+h), W (x-1,y)', () => {
    const expected: Record<number, string> = { 0: '4,3', 1: '6,4', 2: '4,6', 3: '3,4' };
    for (const dir of [0, 1, 2, 3] as Dir[]) {
      const s = ring(dir);
      s.b.output = { item: 'ironOre', count: 2 };
      runMiner(s.state, s.b, { ...s.def, miningTicks: 0 }, s.defs, undefined);
      expect(chestItems(s), `dir ${dir}`).toEqual([expected[dir]]);
      expect(s.b.output).toEqual({ item: 'ironOre', count: 1 });
    }
  });

  it('у прямоугольного бура 3×1 передний край зависит от поворота', () => {
    const def = rig([3, 1], { miningTicks: 0 });
    const east = ring(1, def);
    east.b.output = { item: 'ironOre', count: 1 };
    runMiner(east.state, east.b, def, east.defs, undefined);
    expect(chestItems(east)).toEqual(['5,4']);
    const south = ring(2, def);
    south.b.output = { item: 'ironOre', count: 1 };
    runMiner(south.state, south.b, def, south.defs, undefined);
    expect(chestItems(south)).toEqual(['4,5']);
  });

  it('последняя единица буфера уходит, и буфер становится null; выдача не требует энергии и залежи', () => {
    const def = rig([2, 2], { energy: { kind: 'electric', kw: 1 } });
    const s = ring(0, def);
    s.state.map.deposits.fill(null);
    s.b.output = { item: 'ironOre', count: 1 };
    runMiner(s.state, s.b, def, s.defs, undefined);
    expect(s.b.output).toBeNull();
    expect(buildingAt(s.state, 4, 3)?.slots).toEqual([{ item: 'ironOre', count: 1 }]);
  });

  it('если спереди пусто или принять нельзя, буфер не меняется', () => {
    const s = setup(rig([2, 2], { miningTicks: 0 }), []);
    s.b.output = { item: 'ironOre', count: 2 };
    runMiner(s.state, s.b, s.def, s.defs, undefined);
    expect(s.b.output).toEqual({ item: 'ironOre', count: 2 });
    give(s.state, 'generator', 1);
    placeBuilding(s.state, 'generator', 4, 3, 0, s.defs);
    runMiner(s.state, s.b, s.def, s.defs, undefined);
    expect(s.b.output).toEqual({ item: 'ironOre', count: 2 });
  });
});

describe('бур: клетка с индексом 0', () => {
  it('залежь в углу карты (индекс 0) добывается', () => {
    const state = createState(1, { width: 12, height: 12, deposits: [{ x: 0, y: 0, item: 'ironOre', amount: 5 }] });
    const def = rig([2, 2]);
    const defs: BuildingDefs = { ...buildings, rig: def };
    give(state, 'rig', 1);
    placeBuilding(state, 'rig', 0, 0, 0, defs);
    const b = buildingAt(state, 0, 0)!;
    for (let i = 0; i < 2; i++) runMiner(state, b, def, defs, undefined);
    expect(b.output).toEqual({ item: 'ironOre', count: 1 });
    expect(state.map.deposits[0]?.amount).toBe(4);
  });
});
