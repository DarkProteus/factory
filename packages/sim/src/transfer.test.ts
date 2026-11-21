import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP } from './belt';
import type { BuildingDefs, PlacedBuilding } from './buildings';
import { accept, canAccept, takeFrom } from './transfer';

const defs: BuildingDefs = {
  ...buildings,
  turret: { size: [1, 1], behavior: 'turret', hp: 100 } as BuildingDef,
};
const any = (): boolean => true;
const none = (): boolean => false;
const only = (item: string) => (i: string) => i === item;

function make(type: string, extra: Partial<PlacedBuilding> = {}): PlacedBuilding {
  return { id: 1, type, x: 0, y: 0, dir: 1, progress: 0, output: null, ...extra };
}

describe('canAccept', () => {
  it('неизвестный тип здания ничего не принимает', () => {
    expect(canAccept(make('nope'), 'ironOre', defs)).toBe(false);
  });

  it('конвейер и подземный: пустой или последний предмет за зазором — принимает, ближе — нет', () => {
    for (const type of ['belt', 'undergroundBelt']) {
      expect(canAccept(make(type), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type, { belt: [] }), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type, { belt: [{ item: 'ironOre', pos: BELT_GAP }] }), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type, { belt: [{ item: 'ironOre', pos: BELT_GAP - 1 }] }), 'ironOre', defs)).toBe(false);
      // Проверяется именно последний предмет массива.
      expect(canAccept(make(type, { belt: [{ item: 'ironOre', pos: 0 }, { item: 'ironOre', pos: 200 }] }), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type, { belt: [{ item: 'ironOre', pos: 200 }, { item: 'ironOre', pos: 0 }] }), 'ironOre', defs)).toBe(false);
    }
  });

  it('разделитель: один предмет в пустой буфер, руками (stack) не принимает', () => {
    for (const type of ['splitter', 'filterSplitter']) {
      expect(canAccept(make(type), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type, { belt: [] }), 'ironOre', defs)).toBe(true);
      expect(canAccept(make(type), 'ironOre', defs, undefined, undefined, 'buffer')).toBe(true);
      expect(canAccept(make(type), 'ironOre', defs, undefined, undefined, 'stack')).toBe(false);
      expect(canAccept(make(type, { belt: [{ item: 'ironOre', pos: 0 }] }), 'ironOre', defs)).toBe(false);
    }
  });

  it('контейнер принимает, пока есть место в ячейках', () => {
    const full = Array.from({ length: 16 }, () => ({ item: 'ironOre', count: 50 }));
    expect(canAccept(make('chest'), 'ironOre', defs)).toBe(true);
    expect(canAccept(make('chest', { slots: full }), 'ironOre', defs)).toBe(false);
    expect(canAccept(make('chest', { slots: full }), 'coal', defs)).toBe(false);
    // Один вид с неполной стопкой — принимает, а другой вид без свободной ячейки — нет.
    const almost = full.map((s, i) => (i === 0 ? { item: 'ironOre', count: 49 } : s));
    expect(canAccept(make('chest', { slots: almost }), 'ironOre', defs)).toBe(true);
    expect(canAccept(make('chest', { slots: almost }), 'coal', defs)).toBe(false);
  });

  it('контейнер без ячеек в b.slots считается пустым: единственная ячейка свободна', () => {
    const one: BuildingDefs = { box: { size: [1, 1], behavior: 'container', hp: 1, slots: 1 } as BuildingDef };
    expect(canAccept(make('box'), 'ironOre', one)).toBe(true);
    expect(canAccept(make('box', { slots: [{ item: 'coal', count: 1 }] }), 'ironOre', one)).toBe(false);
  });

  it('контейнер без slots в определении не принимает', () => {
    const noSlots: BuildingDefs = { box: { size: [1, 1], behavior: 'container', hp: 1 } as BuildingDef };
    expect(canAccept(make('box'), 'ironOre', noSlots)).toBe(false);
  });

  it('генератор принимает топливо и только его', () => {
    expect(canAccept(make('generator'), 'coal', defs)).toBe(true);
    expect(canAccept(make('generator'), 'ironOre', defs)).toBe(false);
  });

  it('печь: топливо в ячейку, руда по рецепту, лимит buffer и stack', () => {
    expect(canAccept(make('furnace'), 'coal', defs)).toBe(true);
    expect(canAccept(make('furnace'), 'ironOre', defs)).toBe(true);
    expect(canAccept(make('furnace'), 'ironOre', defs, [])).toBe(false);
    const two = make('furnace', { input: [{ item: 'ironOre', count: 2 }] });
    expect(canAccept(two, 'ironOre', defs)).toBe(false);
    expect(canAccept(two, 'ironOre', defs, undefined, undefined, 'stack')).toBe(true);
  });

  it('лаборатория: только пакеты активной технологии', () => {
    const lab = make('lab');
    expect(canAccept(lab, 'sciencePackRed', defs)).toBe(false);
    expect(canAccept(lab, 'sciencePackRed', defs, undefined, null)).toBe(false);
    expect(canAccept(lab, 'sciencePackRed', defs, undefined, 'logistics')).toBe(true);
    expect(canAccept(lab, 'ironOre', defs, undefined, 'logistics')).toBe(false);
    const stocked = make('lab', { input: [{ item: 'sciencePackRed', count: 2 }] });
    expect(canAccept(stocked, 'sciencePackRed', defs, undefined, 'logistics')).toBe(false);
    expect(canAccept(stocked, 'sciencePackRed', defs, undefined, 'logistics', 'stack')).toBe(true);
  });

  it('бур, манипулятор, столб и турель ничего не принимают', () => {
    for (const type of ['drill', 'inserter', 'fastInserter', 'pole', 'turret']) {
      expect(canAccept(make(type), 'ironOre', defs)).toBe(false);
      expect(canAccept(make(type), 'coal', defs)).toBe(false);
    }
  });
});

describe('accept', () => {
  it('конвейер и подземный кладут предмет на вход', () => {
    for (const type of ['belt', 'undergroundBelt']) {
      const b = make(type);
      accept(b, 'ironOre', defs);
      expect(b.belt).toEqual([{ item: 'ironOre', pos: 0 }]);
    }
  });

  it('разделитель держит предмет посередине клетки', () => {
    for (const type of ['splitter', 'filterSplitter']) {
      const b = make(type);
      accept(b, 'ironOre', defs);
      expect(b.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL / 2 }]);
    }
  });

  it('печь кладёт руду на вход, топливо в ячейку топлива', () => {
    const b = make('furnace');
    accept(b, 'ironOre', defs);
    expect(b.input).toEqual([{ item: 'ironOre', count: 1 }]);
    accept(b, 'coal', defs);
    expect(b.fuel).toEqual({ item: 'coal', count: 1 });
    accept(b, 'coal', defs);
    expect(b.fuel).toEqual({ item: 'coal', count: 2 });
  });

  it('контейнер складывает в ячейки', () => {
    const b = make('chest');
    accept(b, 'ironOre', defs);
    accept(b, 'ironOre', defs);
    accept(b, 'coal', defs);
    expect(b.slots).toEqual([{ item: 'ironOre', count: 2 }, { item: 'coal', count: 1 }]);
  });

  it('контейнер без slots в определении не складывает', () => {
    const noSlots: BuildingDefs = { box: { size: [1, 1], behavior: 'container', hp: 1 } as BuildingDef };
    const b = make('box');
    accept(b, 'ironOre', noSlots);
    expect(b.slots ?? []).toEqual([]);
  });

  it('генератор берёт топливо, лаборатория пакет', () => {
    const g = make('generator');
    accept(g, 'coal', defs);
    expect(g.fuel).toEqual({ item: 'coal', count: 1 });
    const l = make('lab');
    accept(l, 'sciencePackRed', defs);
    expect(l.input).toEqual([{ item: 'sciencePackRed', count: 1 }]);
  });

  it('бур, манипулятор, столб и турель не меняются', () => {
    for (const type of ['drill', 'inserter', 'pole', 'turret']) {
      const b = make(type);
      accept(b, 'ironOre', defs);
      expect(b).toEqual(make(type));
    }
  });
});

describe('takeFrom', () => {
  it('неизвестный тип — null', () => {
    expect(takeFrom(make('nope', { output: { item: 'ironOre', count: 1 } }), any, defs)).toBeNull();
    // Даже с предметами в полях здания, которые читают другие поведения.
    const b = make('nope', { belt: [{ item: 'ironOre', pos: 0 }], slots: [{ item: 'ironOre', count: 1 }] });
    expect(takeFrom(b, any, defs)).toBeNull();
    expect(b.belt).toEqual([{ item: 'ironOre', pos: 0 }]);
  });

  it('конвейер: первый подходящий предмет, не только первый по очереди', () => {
    const b = make('belt', { belt: [{ item: 'coal', pos: 200 }, { item: 'ironOre', pos: 100 }, { item: 'ironOre', pos: 0 }] });
    expect(takeFrom(b, only('ironOre'), defs)).toBe('ironOre');
    expect(b.belt).toEqual([{ item: 'coal', pos: 200 }, { item: 'ironOre', pos: 0 }]);
    expect(takeFrom(b, only('copperOre'), defs)).toBeNull();
    expect(b.belt).toHaveLength(2);
    expect(takeFrom(make('belt'), any, defs)).toBeNull();
  });

  it('подземный: берутся только предметы на поверхности (pos <= BELT_CELL)', () => {
    const b = make('undergroundBelt', { belt: [{ item: 'ironOre', pos: BELT_CELL + 1 }, { item: 'coal', pos: BELT_CELL }] });
    expect(takeFrom(b, only('ironOre'), defs)).toBeNull();
    expect(b.belt).toHaveLength(2);
    expect(takeFrom(b, any, defs)).toBe('coal');
    expect(b.belt).toEqual([{ item: 'ironOre', pos: BELT_CELL + 1 }]);
    expect(takeFrom(b, any, defs)).toBeNull();
    expect(takeFrom(make('undergroundBelt'), any, defs)).toBeNull();
  });

  it('разделитель: из буфера, если предмет одобрен', () => {
    for (const type of ['splitter', 'filterSplitter']) {
      const b = make(type, { belt: [{ item: 'ironOre', pos: 128 }] });
      expect(takeFrom(b, none, defs)).toBeNull();
      expect(b.belt).toHaveLength(1);
      expect(takeFrom(b, any, defs)).toBe('ironOre');
      expect(b.belt).toEqual([]);
      expect(takeFrom(b, any, defs)).toBeNull();
      expect(takeFrom(make(type), any, defs)).toBeNull();
    }
  });

  it('бур и печь отдают выход по одному, пустой выход обнуляется', () => {
    for (const type of ['drill', 'furnace']) {
      const b = make(type, { output: { item: 'ironPlate', count: 2 } });
      expect(takeFrom(b, none, defs)).toBeNull();
      expect(b.output).toEqual({ item: 'ironPlate', count: 2 });
      expect(takeFrom(b, any, defs)).toBe('ironPlate');
      expect(b.output).toEqual({ item: 'ironPlate', count: 1 });
      expect(takeFrom(b, any, defs)).toBe('ironPlate');
      expect(b.output).toBeNull();
      expect(takeFrom(b, any, defs)).toBeNull();
    }
  });

  it('контейнер отдаёт предмет из ячеек', () => {
    const b = make('chest', { slots: [{ item: 'coal', count: 1 }, { item: 'ironOre', count: 2 }] });
    expect(takeFrom(b, only('ironOre'), defs)).toBe('ironOre');
    expect(b.slots).toEqual([{ item: 'coal', count: 1 }, { item: 'ironOre', count: 1 }]);
    expect(takeFrom(b, only('copperOre'), defs)).toBeNull();
    expect(takeFrom(make('chest'), any, defs)).toBeNull();
  });

  it('лаборатория отдаёт пакеты из ячеек, пустые стеки пропускает и оставляет с нулём', () => {
    const b = make('lab', { input: [{ item: 'sciencePackRed', count: 0 }, { item: 'sciencePackGreen', count: 2 }] });
    expect(takeFrom(b, only('sciencePackRed'), defs)).toBeNull();
    expect(takeFrom(b, none, defs)).toBeNull();
    expect(b.input![1]!.count).toBe(2);
    expect(takeFrom(b, only('sciencePackGreen'), defs)).toBe('sciencePackGreen');
    expect(takeFrom(b, only('sciencePackGreen'), defs)).toBe('sciencePackGreen');
    expect(b.input).toEqual([{ item: 'sciencePackRed', count: 0 }, { item: 'sciencePackGreen', count: 0 }]);
    expect(takeFrom(b, any, defs)).toBeNull();
    expect(takeFrom(make('lab'), any, defs)).toBeNull();
  });

  it('генератор, манипулятор, столб и турель ничего не отдают', () => {
    for (const type of ['generator', 'inserter', 'pole', 'turret']) {
      const b = make(type, { fuel: { item: 'coal', count: 5 }, output: { item: 'coal', count: 1 }, slots: [{ item: 'coal', count: 1 }] });
      expect(takeFrom(b, any, defs)).toBeNull();
      expect(b.fuel).toEqual({ item: 'coal', count: 5 });
    }
  });
});
