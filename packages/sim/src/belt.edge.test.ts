import { buildings } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP, isBelt, moveBelt, pushToBelt } from './belt';
import type { PlacedBuilding } from './buildings';

const SPEED = buildings.belt.beltSpeed!;
const mk = (belt?: PlacedBuilding['belt']): PlacedBuilding => ({ id: 1, type: 'belt', x: 0, y: 0, dir: 1, ...(belt ? { belt } : {}) }) as PlacedBuilding;

describe('moveBelt: вход в разделитель', () => {
  it('головной предмет входит в пустой буфер, только дойдя до конца клетки', () => {
    const b = mk([{ item: 'coal', pos: BELT_CELL - SPEED - 1 }]);
    const sp = mk();
    moveBelt(b, buildings.belt, sp, true);
    expect(b.belt).toEqual([{ item: 'coal', pos: BELT_CELL - 1 }]);
    expect(sp.belt).toBeUndefined();
    moveBelt(b, buildings.belt, sp, true);
    expect(b.belt).toEqual([]);
    expect(sp.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
  });

  it('предмет, дошедший ровно до конца клетки, входит сразу', () => {
    const b = mk([{ item: 'coal', pos: BELT_CELL - SPEED }]);
    const sp = mk();
    moveBelt(b, buildings.belt, sp, true);
    expect(b.belt).toEqual([]);
    expect(sp.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
  });

  it('занятый буфер не принимает; пустой массив буфера считается свободным', () => {
    const b = mk([{ item: 'coal', pos: BELT_CELL }]);
    const sp = mk([{ item: 'ironOre', pos: BELT_CELL / 2 }]);
    moveBelt(b, buildings.belt, sp, true);
    expect(b.belt).toEqual([{ item: 'coal', pos: BELT_CELL }]);
    expect(sp.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL / 2 }]);
    sp.belt = [];
    moveBelt(b, buildings.belt, sp, true);
    expect(b.belt).toEqual([]);
    expect(sp.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
  });

  it('за один шаг в разделитель уходит один предмет, остальные ждут с зазором', () => {
    const b = mk([
      { item: 'coal', pos: BELT_CELL },
      { item: 'ironOre', pos: BELT_CELL - BELT_GAP },
    ]);
    const sp = mk();
    moveBelt(b, buildings.belt, sp, true);
    expect(sp.belt).toEqual([{ item: 'coal', pos: BELT_CELL / 2 }]);
    expect(b.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL - BELT_GAP }]);
  });

  it('длина ленты задаёт порог входа: у длинной ленты предмет в первой клетке не входит', () => {
    const b = mk([{ item: 'coal', pos: BELT_CELL }]);
    const sp = mk();
    moveBelt(b, buildings.belt, sp, true, BELT_CELL * 2);
    expect(sp.belt).toBeUndefined();
    expect(b.belt).toEqual([{ item: 'coal', pos: BELT_CELL + SPEED }]);
  });

  it('pushToBelt: зазор BELT_GAP от последнего предмета', () => {
    const b = mk([{ item: 'coal', pos: BELT_GAP - 1 }]);
    expect(pushToBelt(b, 'ironOre')).toBe(false);
    b.belt![0]!.pos = BELT_GAP;
    expect(pushToBelt(b, 'ironOre')).toBe(true);
  });
});

describe('isBelt', () => {
  it('null, неизвестный тип и не-конвейер — нет, конвейер — да', () => {
    expect(isBelt(null, buildings)).toBe(false);
    expect(isBelt({ type: 'nope' } as PlacedBuilding, buildings)).toBe(false);
    expect(isBelt({ type: 'chest' } as PlacedBuilding, buildings)).toBe(false);
    expect(isBelt({ type: 'belt' } as PlacedBuilding, buildings)).toBe(true);
  });
});
