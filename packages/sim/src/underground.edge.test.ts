import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL, pushToBelt } from './belt';
import { buildingAt, placeBuilding, type BuildingDefs, type Dir, type PlacedBuilding } from './buildings';
import { createState, type SimState } from './state';
import { tick } from './tick';
import { stocked } from './testKit';
import { acceptsBeltFrom, insideSpan, isUnderground, laneLength, partnerOf, tunnelItems, undergroundPlacement } from './underground';

const UB = 'undergroundBelt';
const at = (s: SimState, x: number, y: number): PlacedBuilding => buildingAt(s, x, y)!;
const field = (): SimState => stocked(createState(1, { width: 20, height: 16 }));
/** Ставит подземные подряд через команду build: роль определяет сама постановка. */
function place(s: SimState, xs: number[], type = UB, dir: Dir = 1, y = 5): void {
  for (const x of xs) tick(s, [{ type: 'build', building: type, x, y, dir }]);
}

describe('подземный: дальность пары (граница reach + 1)', () => {
  it('выход на расстоянии 5 (4 клетки между) образует пару, на 6 — нет', () => {
    const s = field();
    place(s, [2, 7]);
    expect(at(s, 7, 5).underground).toBe('out');
    expect(partnerOf(s, at(s, 2, 5), buildings)).toBe(at(s, 7, 5));
    expect(laneLength(s, at(s, 2, 5), buildings)).toBe(BELT_CELL * 5);
    const far = field();
    place(far, [2, 8]);
    expect(at(far, 8, 5).underground).toBe('in');
    expect(partnerOf(far, at(far, 2, 5), buildings)).toBeNull();
  });

  it('соседний выход образует пару на расстоянии 1', () => {
    const s = field();
    place(s, [2, 3]);
    expect(at(s, 3, 5).underground).toBe('out');
    expect(partnerOf(s, at(s, 2, 5), buildings)).toBe(at(s, 3, 5));
    expect(partnerOf(s, at(s, 3, 5), buildings)).toBe(at(s, 2, 5));
    expect(laneLength(s, at(s, 2, 5), buildings)).toBe(BELT_CELL);
  });

  it('вход без пары и выход имеют длину ленты в одну клетку', () => {
    const s = field();
    place(s, [2, 6]);
    place(s, [12]);
    expect(laneLength(s, at(s, 12, 5), buildings)).toBe(BELT_CELL);
    expect(laneLength(s, at(s, 6, 5), buildings)).toBe(BELT_CELL);
    expect(laneLength(s, at(s, 2, 5), buildings)).toBe(BELT_CELL * 4);
  });

  it('undergroundPlacement: роль выхода и пара на расстоянии 1 и 5, вход на 6', () => {
    const s = field();
    place(s, [2]);
    const inId = at(s, 2, 5).id;
    expect(undergroundPlacement(s, UB, 7, 5, 1)).toEqual({ role: 'out', partner: inId });
    expect(undergroundPlacement(s, UB, 8, 5, 1)).toEqual({ role: 'in', partner: null });
    expect(undergroundPlacement(s, UB, 3, 5, 1)).toEqual({ role: 'out', partner: inId });
  });

  it('undergroundPlacement: другое направление, другой тип или занятый вход дают вход', () => {
    const s = field();
    place(s, [2]);
    expect(undergroundPlacement(s, UB, 5, 5, 3)).toEqual({ role: 'in', partner: null });
    expect(undergroundPlacement(s, 'fastUndergroundBelt', 5, 5, 1)).toEqual({ role: 'in', partner: null });
    place(s, [4]);
    // Теперь у (2,5) есть пара (4,5), а назад от (6,5) ближайший — выход (4,5).
    expect(undergroundPlacement(s, UB, 6, 5, 1)).toEqual({ role: 'in', partner: null });
  });

  it('пары разных направлений не мешают друг другу', () => {
    const s = field();
    place(s, [2], UB, 1, 5);
    place(s, [2], UB, 0, 6);
    expect(partnerOf(s, at(s, 2, 5), buildings)).toBeNull();
    place(s, [6], UB, 1, 5);
    expect(partnerOf(s, at(s, 2, 5), buildings)).toBe(at(s, 6, 5));
  });
});

describe('подземный: пары и пролёт', () => {
  it('снос выхода между двумя входами не сцепляет входы между собой', () => {
    const s = field();
    place(s, [3, 5, 6]);
    expect(at(s, 5, 5).underground).toBe('out');
    tick(s, [{ type: 'demolish', x: 5, y: 5 }]);
    expect(at(s, 6, 5).underground).toBe('in');
    expect(partnerOf(s, at(s, 3, 5), buildings)).toBeNull();
    expect(partnerOf(s, at(s, 6, 5), buildings)).toBeNull();
  });

  it('тип без поведения underground не образует пар', () => {
    const s = field();
    place(s, [3, 7]);
    const plain: BuildingDefs = { ...buildings, [UB]: { ...buildings[UB], behavior: 'belt' } as BuildingDef };
    expect(partnerOf(s, at(s, 3, 5), buildings)).toBe(at(s, 7, 5));
    expect(partnerOf(s, at(s, 3, 5), plain)).toBeNull();
  });

  it('insideSpan: внутри пролёта да, на выходе, у входа и за ним нет', () => {
    const s = field();
    place(s, [3, 7]);
    expect(insideSpan(s, UB, 4, 5, 1, buildings)).toBe(true);
    expect(insideSpan(s, UB, 6, 5, 1, buildings)).toBe(true);
    expect(insideSpan(s, UB, 7, 5, 1, buildings)).toBe(false);
    expect(insideSpan(s, UB, 8, 5, 1, buildings)).toBe(false);
    expect(insideSpan(s, UB, 2, 5, 1, buildings)).toBe(false);
    expect(insideSpan(s, UB, 5, 5, 0, buildings)).toBe(false);
    expect(insideSpan(s, 'fastUndergroundBelt', 5, 5, 1, buildings)).toBe(false);
  });

  it('insideSpan: ближайший назад вход без пары — не пролёт', () => {
    const s = field();
    place(s, [3]);
    expect(insideSpan(s, UB, 5, 5, 1, buildings)).toBe(false);
  });
});

describe('подземный: acceptsBeltFrom и tunnelItems', () => {
  it('acceptsBeltFrom: вход принимает только ленту того же направления, выход — никого', () => {
    const s = field();
    place(s, [3, 7]);
    const same = { dir: 1 } as PlacedBuilding;
    const other = { dir: 0 } as PlacedBuilding;
    expect(acceptsBeltFrom(at(s, 3, 5), same)).toBe(true);
    expect(acceptsBeltFrom(at(s, 3, 5), other)).toBe(false);
    expect(acceptsBeltFrom(at(s, 7, 5), same)).toBe(false);
  });

  it('tunnelItems: только предметы за первой клеткой, предмет ровно на границе остаётся', () => {
    const s = field();
    place(s, [3, 7]);
    at(s, 3, 5).belt = [
      { item: 'coal', pos: BELT_CELL + 1 },
      { item: 'ironPlate', pos: BELT_CELL },
      { item: 'copperPlate', pos: 10 },
    ];
    const r = tunnelItems(s, at(s, 7, 5), buildings)!;
    expect(r.from).toBe(at(s, 3, 5));
    expect(r.items).toEqual([{ item: 'coal', pos: BELT_CELL + 1 }]);
  });

  it('tunnelItems: у входа, без пары и у не-подземного здания — null', () => {
    const s = field();
    place(s, [3, 7]);
    expect(tunnelItems(s, at(s, 3, 5), buildings)).toBeNull();
    const lone = field();
    place(lone, [3]);
    expect(tunnelItems(lone, at(lone, 3, 5), buildings)).toBeNull();
    const fake = { ...at(s, 7, 5), type: 'belt' } as PlacedBuilding;
    expect(tunnelItems(s, fake, buildings)).toBeNull();
    const orphan = { ...at(s, 7, 5), id: 9999 } as PlacedBuilding;
    expect(tunnelItems(s, orphan, buildings)).toBeNull();
  });

  it('tunnelItems: вход без ленты даёт пустой список', () => {
    const s = field();
    place(s, [3, 7]);
    delete at(s, 3, 5).belt;
    expect(tunnelItems(s, at(s, 7, 5), buildings)).toEqual({ from: at(s, 3, 5), items: [] });
  });
});

describe('подземный: перенос через тоннель длиннее одной клетки', () => {
  it('предмет не выходит на ленту за выходом раньше, чем пройдёт весь тоннель', () => {
    const s = field();
    placeBuilding(s, 'belt', 8, 5, 1);
    place(s, [3, 7]);
    pushToBelt(at(s, 3, 5), 'coal');
    // Тоннель 4 клетки при скорости 8: 4 * 256 / 8 = 128 тиков до конца ленты входа.
    for (let i = 0; i < 100; i++) tick(s, []);
    expect(at(s, 8, 5).belt ?? []).toEqual([]);
    expect(at(s, 3, 5).belt!.length).toBe(1);
  });
});

describe('подземный: вертикальные и встречные ряды', () => {
  it('пары по вертикали в обе стороны: на север и на юг, с расстоянием больше 1', () => {
    for (const [dir, ys] of [[0, [9, 6]], [2, [3, 6]]] as const) {
      const s = field();
      for (const y of ys) tick(s, [{ type: 'build', building: UB, x: 4, y, dir }]);
      expect(at(s, 4, ys[1]).underground).toBe('out');
      expect(partnerOf(s, at(s, 4, ys[0]), buildings)).toBe(at(s, 4, ys[1]));
      expect(laneLength(s, at(s, 4, ys[0]), buildings)).toBe(BELT_CELL * 3);
      for (const y of dir === 0 ? [7, 8] : [4, 5]) expect(insideSpan(s, UB, 4, y, dir, buildings)).toBe(true);
    }
  });

  it('пара на запад по горизонтали', () => {
    const s = field();
    place(s, [9, 5], UB, 3);
    expect(at(s, 5, 5).underground).toBe('out');
    expect(partnerOf(s, at(s, 9, 5), buildings)).toBe(at(s, 5, 5));
  });

  it('здание на ряду другого направления не считается партнёром', () => {
    const s = field();
    place(s, [2]);
    // Встречный вход на том же ряду: смотрит на запад, ряд назад от (1,5) идёт на восток к (2,5).
    expect(undergroundPlacement(s, UB, 1, 5, 3)).toEqual({ role: 'in', partner: null });
    expect(undergroundPlacement(s, UB, 2, 7, 0)).toEqual({ role: 'in', partner: null });
  });

  it('осиротевший выход (вход снесён) не даёт роль выхода следующему', () => {
    const s = field();
    place(s, [1, 3]);
    tick(s, [{ type: 'demolish', x: 1, y: 5 }]);
    expect(at(s, 3, 5).underground).toBe('out');
    expect(undergroundPlacement(s, UB, 5, 5, 1)).toEqual({ role: 'in', partner: null });
  });

  it('выход не начинает пару: у выхода с выходом позади остаётся его вход', () => {
    const s = field();
    place(s, [3, 4, 5]);
    // Искусственная расстановка ролей: вход (3), выход (4), выход (5).
    at(s, 4, 5).underground = 'out';
    at(s, 5, 5).underground = 'out';
    // Свежий defs: кеш пар, посчитанный в tick до подмены ролей, к нему не относится.
    const fresh: BuildingDefs = { ...buildings };
    expect(partnerOf(s, at(s, 4, 5), fresh)).toBe(at(s, 3, 5));
    expect(partnerOf(s, at(s, 5, 5), fresh)).toBeNull();
  });

  it('isUnderground: null и неизвестный тип — не подземный', () => {
    expect(isUnderground(null, buildings)).toBe(false);
    expect(isUnderground({ type: 'nope' } as PlacedBuilding, buildings)).toBe(false);
    expect(isUnderground({ type: 'belt' } as PlacedBuilding, buildings)).toBe(false);
    expect(isUnderground({ type: UB } as PlacedBuilding, buildings)).toBe(true);
  });

  it('неизвестный тип: дальность 0, роль «вход»', () => {
    const s = field();
    place(s, [2]);
    expect(undergroundPlacement(s, 'nope', 4, 5, 1, buildings)).toEqual({ role: 'in', partner: null });
    expect(insideSpan(s, 'nope', 4, 5, 1, buildings)).toBe(false);
  });

  it('кеш пар обновляется при стройке и при смене defs', () => {
    const s = field();
    place(s, [3]);
    const inB = at(s, 3, 5);
    expect(partnerOf(s, inB, buildings)).toBeNull();
    place(s, [6]);
    expect(partnerOf(s, inB, buildings)).toBe(at(s, 6, 5));
    const fast: BuildingDefs = { ...buildings, [UB]: { ...buildings[UB], undergroundReach: 1 } as BuildingDef };
    expect(partnerOf(s, inB, fast)).toBeNull();
    expect(partnerOf(s, inB, buildings)).toBe(at(s, 6, 5));
  });
});
