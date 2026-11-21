// Сеть столбов: корень группы, радиус проводов, границы зоны покрытия (мутанты TASK-83).
import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { placeBuilding, type BuildingDefs, type Dir } from './buildings';
import { createState } from './index';
import { powerNetworks, wireTree } from './network';
import { give } from './testKit';

const pole = (id: number, x: number, y: number, type = 'pole') => ({ id, type, x, y });

describe('wireTree: корень группы и радиус', () => {
  it('сетью становится меньший id, даже когда ребро соединяет младшую группу со старшей', () => {
    // Рёбра по возрастанию длины: (1,3), потом (2,3): к группе {1,3} присоединяется столб 2 с бо́льшим корнем-кандидатом.
    const { parent, wires } = wireTree([pole(1, 10, 10), pole(2, 10, 16), pole(3, 10, 12)]);
    expect(wires).toEqual([[1, 3], [2, 3]]);
    const root = (id: number): number => (parent.get(id) === id ? id : root(parent.get(id)!));
    expect([1, 2, 3].map(root)).toEqual([1, 1, 1]);
  });

  it('группы {2,3} и {1,4} сливаются в сеть с корнем 1', () => {
    // Рёбра: (2,3), (1,4), затем (2,4): корень второй группы 2 больше корня первой 1.
    const { parent } = wireTree([pole(1, 0, 0), pole(2, 9, 0), pole(3, 11, 0), pole(4, 3, 0)]);
    const root = (id: number): number => (parent.get(id) === id ? id : root(parent.get(id)!));
    expect([1, 2, 3, 4].map(root)).toEqual([1, 1, 1, 1]);
  });

  it('при равных расстояниях ребро выбирается по паре id, а не по порядку списка', () => {
    // Квадрат со стороной 4, столбы переданы по убыванию id (вне контракта, но тай-брейк должен решать по id): лишнее ребро — (4,3).
    const square = [pole(4, 10, 14), pole(3, 14, 14), pole(2, 14, 10), pole(1, 10, 10)];
    expect(wireTree(square).wires).toEqual([[2, 1], [3, 2], [4, 1]]);
  });

  it('радиус — меньший из wireReach двух столбов; без wireReach столб ни с кем не связан', () => {
    const defs = {
      long: { ...buildings.pole, wireReach: 7 },
      short: { ...buildings.pole, wireReach: 3 },
      dumb: { ...buildings.pole, wireReach: undefined },
    } as unknown as BuildingDefs;
    expect(wireTree([pole(1, 0, 0, 'long'), pole(2, 5, 0, 'long')], defs).wires).toEqual([[1, 2]]);
    expect(wireTree([pole(1, 0, 0, 'long'), pole(2, 5, 0, 'short')], defs).wires).toEqual([]);
    expect(wireTree([pole(1, 0, 0, 'short'), pole(2, 3, 0, 'short')], defs).wires).toEqual([[1, 2]]);
    expect(wireTree([pole(1, 0, 0, 'long'), pole(2, 1, 0, 'dumb')], defs).wires).toEqual([]);
    expect(wireTree([pole(1, 0, 0, 'dumb'), pole(2, 1, 0, 'long')], defs).wires).toEqual([]);
  });
});

const wide = { size: [3, 1], energy: { kind: 'electric', kw: 5 }, behavior: 'crafter', hp: 1 } as unknown as BuildingDef;
const defs = { ...buildings, wide } as BuildingDefs;

/** Столб в (20,20) покрывает клетки 18..22 по обеим осям; true — здание типа type в (x,y) попало в его сеть. */
function covered(type: string, x: number, y: number, dir: Dir = 0): boolean {
  const state = give(createState(1, { width: 40, height: 40 }), 'pole', 1);
  give(state, type, 1);
  placeBuilding(state, 'pole', 20, 20, 0, defs);
  placeBuilding(state, type, x, y, dir, defs);
  const nets = powerNetworks(state, defs);
  const id = Object.values(state.buildings).find((b) => b.type === type)!.id;
  return nets.buildingNet.has(id);
}

describe('зона покрытия столба 5×5', () => {
  it.each([
    ['слева', 18, 20, 17, 20],
    ['справа', 22, 20, 23, 20],
    ['сверху', 20, 18, 20, 17],
    ['снизу', 20, 22, 20, 23],
  ])('граница %s: крайняя клетка внутри, следующая снаружи', (_side, inX, inY, outX, outY) => {
    expect(covered('inserter', inX!, inY!)).toBe(true);
    expect(covered('inserter', outX!, outY!)).toBe(false);
  });

  it('угловая клетка зоны внутри, по диагонали за углом — снаружи', () => {
    for (const [x, y] of [[18, 18], [22, 18], [18, 22], [22, 22]] as const) expect(covered('inserter', x, y)).toBe(true);
    for (const [x, y] of [[17, 17], [23, 17], [17, 23], [23, 23]] as const) expect(covered('inserter', x, y)).toBe(false);
  });

  it('большое здание считается по дальнему краю отпечатка', () => {
    // Сборщик 3×3 в (16,20) занимает x 16..18: задевает зону левой клеткой; в (15,20) — x 15..17, нет.
    expect(covered('assembler', 16, 20)).toBe(true);
    expect(covered('assembler', 15, 20)).toBe(false);
    expect(covered('assembler', 20, 16)).toBe(true);
    expect(covered('assembler', 20, 15)).toBe(false);
    expect(covered('assembler', 22, 20)).toBe(true);
    expect(covered('assembler', 23, 20)).toBe(false);
    expect(covered('assembler', 20, 22)).toBe(true);
    expect(covered('assembler', 20, 23)).toBe(false);
  });

  it('несимметричный отпечаток учитывает поворот: ширина и высота не путаются', () => {
    // wide 3×1: dir 0 — три клетки вдоль x, dir 1 — три клетки вдоль y.
    expect(covered('wide', 16, 20, 0)).toBe(true); // x 16..18
    expect(covered('wide', 16, 20, 1)).toBe(false); // x 16, y 20..22
    expect(covered('wide', 20, 16, 1)).toBe(true); // x 20, y 16..18
    expect(covered('wide', 20, 16, 0)).toBe(false); // y 16, x 20..22
    expect(covered('wide', 20, 23, 0)).toBe(false);
    expect(covered('wide', 20, 21, 1)).toBe(true); // y 21..23
  });
});

describe('powerNetworks: здания вне таблицы', () => {
  it('здание, которого нет в defs, пропускается без ошибки', () => {
    const state = give(createState(1, { width: 10, height: 10 }), 'chest', 1);
    placeBuilding(state, 'chest', 2, 2, 0, defs);
    const nets = powerNetworks(state, { pole: buildings.pole } as BuildingDefs);
    expect(nets.poleNet.size).toBe(0);
    expect(nets.buildingNet.size).toBe(0);
    expect(nets.wires).toEqual([]);
  });
});

describe('powerNetworks: кеш', () => {
  it('без стройки и сноса возвращает тот же объект, после стройки — пересчитывает', () => {
    const state = give(createState(1, { width: 20, height: 20 }), 'pole', 2);
    placeBuilding(state, 'pole', 2, 2, 0, defs);
    const first = powerNetworks(state, defs);
    expect(powerNetworks(state, defs)).toBe(first);
    placeBuilding(state, 'pole', 5, 2, 0, defs);
    const second = powerNetworks(state, defs);
    expect(second).not.toBe(first);
    expect(second.wires).toHaveLength(1);
  });
});
