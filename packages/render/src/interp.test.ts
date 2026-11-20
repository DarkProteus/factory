import { describe, expect, it } from 'vitest';
import { beltItemPos } from './interp';

const SPEED = 8;

describe('интерполяция предметов на конвейере', () => {
  it('предмет плавно едет от позиции прошлого тика к текущей', () => {
    const prev = [{ item: 'ironOre', pos: 100 }];
    expect(beltItemPos(prev, 'ironOre', 108, SPEED, 0)).toBe(100);
    expect(beltItemPos(prev, 'ironOre', 108, SPEED, 0.5)).toBe(104);
    expect(beltItemPos(prev, 'ironOre', 108, SPEED, 1)).toBe(108);
  });

  it('стоящий в заторе предмет не дёргается', () => {
    const prev = [{ item: 'ironOre', pos: 256 }];
    expect(beltItemPos(prev, 'ironOre', 256, SPEED, 0.5)).toBe(256);
  });

  it('предмет, перешедший с прошлого конвейера, едет со стыка клеток', () => {
    expect(beltItemPos([], 'ironOre', 4, SPEED, 0)).toBe(-4);
    expect(beltItemPos(undefined, 'ironOre', 4, SPEED, 1)).toBe(4);
  });

  it('предмет, только что положенный в начало конвейера, стоит на месте', () => {
    expect(beltItemPos([], 'ironOre', 0, SPEED, 0.5)).toBe(0);
  });

  it('соседние предметы на расстоянии BELT_GAP не путаются', () => {
    const prev = [
      { item: 'ironOre', pos: 200 },
      { item: 'ironOre', pos: 136 },
    ];
    expect(beltItemPos(prev, 'ironOre', 144, SPEED, 0.5)).toBe(140);
    expect(beltItemPos(prev, 'ironOre', 208, SPEED, 0.5)).toBe(204);
  });
});
