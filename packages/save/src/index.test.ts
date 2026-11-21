import { describe, expect, it } from 'vitest';
import { createState, hash, runTicks, type Command, type PlacedBuilding, type ScheduledCommand, type SimState } from '@factory/sim';
import { deserialize, SAVE_VERSION, SaveError, serialize } from './index';

const E = 1;
const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: E });

/** Бур -> конвейеры -> манипулятор -> печь -> манипулятор -> сундук. */
const BUILD: ScheduledCommand[] = [
  { tick: 0, command: build('drill', 0, 0) },
  // Второй бур упирается в пустую клетку: его выходной буфер заполняется.
  { tick: 0, command: build('drill', 0, 4) },
  { tick: 0, command: build('belt', 2, 0) },
  { tick: 0, command: build('belt', 3, 0) },
  { tick: 0, command: build('belt', 4, 0) },
  { tick: 0, command: build('inserter', 5, 0) },
  { tick: 0, command: build('furnace', 6, 0) },
  { tick: 0, command: build('inserter', 8, 0) },
  { tick: 0, command: build('chest', 9, 0) },
  // Электросеть для буров и манипуляторов: столбы и генератор (уголь кладётся отдельно).
  { tick: 0, command: build('pole', 3, 2) },
  { tick: 0, command: build('pole', 8, 2) },
  { tick: 0, command: build('generator', 3, 4) },
  { tick: 0, command: { type: 'setCounter', key: 'score', value: 7 } },
];

/** Команды, которые идут и до, и после сохранения: ломаем и перестраиваем часть линии. */
const LATER: ScheduledCommand[] = [
  { tick: 1100, command: { type: 'rollCounter', key: 'roll' } },
  { tick: 1200, command: { type: 'demolish', x: 3, y: 0 } },
  { tick: 1300, command: build('belt', 3, 0) },
  { tick: 1400, command: { type: 'rollCounter', key: 'roll2' } },
];

function factory(): SimState {
  const state = createState(12345, { width: 16, height: 16, deposits: [
      { x: 0, y: 0, item: 'ironOre', amount: 5000 },
      { x: 0, y: 4, item: 'ironOre', amount: 5000 },
    ] });
  // Постройка тратит предмет-здание; снесённый конвейер возвращается в инвентарь и уходит на перестройку.
  state.inventory = [
    { item: 'drill', count: 2 },
    { item: 'belt', count: 3 },
    { item: 'inserter', count: 2 },
    { item: 'furnace', count: 1 },
    { item: 'chest', count: 1 },
    { item: 'pole', count: 2 },
    { item: 'generator', count: 1 },
  ];
  runTicks(state, BUILD, 1);
  // Печь жжёт уголь: кладём топливо, чтобы цикл шёл и остаток энергии попал в сохранение.
  Object.values(state.buildings).find((b) => b.type === 'furnace')!.fuel = { item: 'coal', count: 10 };
  Object.values(state.buildings).find((b) => b.type === 'generator')!.fuel = { item: 'coal', count: 10 };
  runTicks(state, BUILD, 399);
  state.inventory = [
    { item: 'ironPlate', count: 40 },
    { item: 'ammo', count: 3 },
  ];
  return state;
}

const roundtrip = (state: SimState): SimState => deserialize(serialize(state));
const all = (state: SimState): PlacedBuilding[] => Object.values(state.buildings);

describe('сохранение завода', () => {
  it('в проверяемом состоянии есть предметы на конвейерах, в буферах, печи и сундуке', () => {
    const state = factory();
    const b = all(state);
    expect(b.some((x) => x.type === 'belt' && (x.belt?.length ?? 0) > 0)).toBe(true);
    expect(b.some((x) => x.type === 'drill' && x.output)).toBe(true);
    expect(b.some((x) => x.type === 'furnace' && (x.input?.length || x.output || x.progress > 0))).toBe(true);
    // Топливо в ячейке печи и остаток энергии сгоревшего угля.
    expect(b.some((x) => x.type === 'furnace' && x.fuel && x.burn)).toBe(true);
    expect(b.some((x) => x.type === 'chest' && x.slots?.length)).toBe(true);
    expect(state.inventory.length).toBe(2);
    expect(state.map.deposits[0]?.item).toBe('ironOre');
  });

  it('состояние после загрузки равно исходному, включая карту и инвентарь', () => {
    const state = factory();
    const loaded = roundtrip(state);
    expect(loaded).toEqual(state);
    expect(loaded.map.deposits[0]).toEqual({ item: 'ironOre', amount: expect.any(Number), initial: 5000 });
    expect(loaded.inventory).toEqual(state.inventory);
  });

  it('хеш после сохранения и загрузки совпадает, в том числе для пустого состояния', () => {
    const state = factory();
    expect(hash(roundtrip(state))).toBe(hash(state));
    const empty = createState(99);
    expect(hash(roundtrip(empty))).toBe(hash(empty));
  });

  it('сохранение не меняет исходное состояние', () => {
    const state = factory();
    const before = hash(state);
    serialize(state);
    expect(hash(state)).toBe(before);
  });

  it('загруженная и исходная партии через 1000 тиков с теми же командами дают один хеш', () => {
    const original = factory();
    const loaded = roundtrip(original);
    runTicks(original, LATER, 1000);
    runTicks(loaded, LATER, 1000);
    expect(loaded.tick).toBe(1400);
    expect(Object.keys(original.counters)).toContain('roll');
    expect(hash(loaded)).toBe(hash(original));
    expect(loaded.rng).toBe(original.rng);
  });
});

describe('версия формата', () => {
  it('сохранение содержит номер версии', () => {
    const file = JSON.parse(serialize(createState(1))) as { version: number };
    expect(file.version).toBe(SAVE_VERSION);
  });

  it('неизвестная версия даёт понятную ошибку', () => {
    const text = JSON.stringify({ version: SAVE_VERSION + 1, state: createState(1) });
    expect(() => deserialize(text)).toThrow(SaveError);
    expect(() => deserialize(text)).toThrow(new RegExp(`Неизвестная версия сохранения: ${SAVE_VERSION + 1}`));
  });

  it('сохранения старых версий не мигрируются: понятная ошибка', () => {
    const file = JSON.parse(serialize(factory()));
    for (const version of [1, 2]) {
      file.version = version;
      expect(() => deserialize(JSON.stringify(file))).toThrow(SaveError);
      expect(() => deserialize(JSON.stringify(file))).toThrow(/устарело: версия \d/);
    }
  });

  it('нет номера версии', () => {
    expect(() => deserialize('{"state":{}}')).toThrow(/номер версии/);
  });
});

describe('битые сохранения', () => {
  it('невалидный JSON', () => {
    expect(() => deserialize('{не json')).toThrow(SaveError);
    expect(() => deserialize('{не json')).toThrow(/не является корректным JSON/);
  });

  const tamper = (change: (s: any) => void): string => {
    const file = JSON.parse(serialize(factory()));
    change(file.state);
    return JSON.stringify(file);
  };

  it('здание, которого нет в content, даёт понятную ошибку, а не падение', () => {
    const text = tamper((s) => {
      s.buildings[1].type = 'teleporter';
    });
    expect(() => deserialize(text)).toThrow(SaveError);
    expect(() => deserialize(text)).toThrow(/здание «teleporter», которого нет в игре/);
  });

  it('предмет, которого нет в content', () => {
    const text = tamper((s) => {
      s.inventory[0].item = 'unobtainium';
    });
    expect(() => deserialize(text)).toThrow(/предмет «unobtainium», которого нет в игре/);
  });

  it('рецепт, которого нет в content', () => {
    const text = tamper((s) => {
      const furnace = Object.values<any>(s.buildings).find((b) => b.type === 'furnace');
      furnace.recipe = 'nope';
    });
    expect(() => deserialize(text)).toThrow(/неизвестный рецепт «nope»/);
  });

  it('ячейка топлива и остаток энергии валидируются', () => {
    const furnace = (s: any) => Object.values<any>(s.buildings).find((b) => b.type === 'furnace');
    expect(() => deserialize(tamper((s) => (furnace(s).fuel = { item: 'unobtainium', count: 1 })))).toThrow(/предмет «unobtainium»/);
    expect(() => deserialize(tamper((s) => (furnace(s).fuel = { item: 'coal', count: 0 })))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => (furnace(s).fuel = 'уголь')))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => (furnace(s).burn = -1)))).toThrow(/burn/);
    expect(() => deserialize(tamper((s) => (furnace(s).burn = 1.5)))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => (furnace(s).burn = 'много')))).toThrow(SaveError);
  });

  it('исходный запас залежи валидируется', () => {
    const bad = (initial: unknown) => tamper((s) => (s.map.deposits[0].initial = initial));
    expect(() => deserialize(bad(undefined))).toThrow(/исходный запас/);
    expect(() => deserialize(bad('много'))).toThrow(SaveError);
    expect(() => deserialize(bad(0))).toThrow(SaveError);
    // Остаток не может превышать исходный запас.
    expect(() => deserialize(bad(1))).toThrow(SaveError);
  });

  it('состояние ручной добычи валидируется и переживает сохранение', () => {
    const state = factory();
    state.mining = { x: 0, y: 0, progress: 7 };
    expect(roundtrip(state).mining).toEqual({ x: 0, y: 0, progress: 7 });
    const bad = (mining: unknown) => tamper((s) => (s.mining = mining));
    expect(() => deserialize(bad(undefined))).toThrow(/добыча/);
    expect(() => deserialize(bad('да'))).toThrow(SaveError);
    expect(() => deserialize(bad({ x: 1, y: 'a', progress: 0 }))).toThrow(SaveError);
    expect(() => deserialize(bad({ x: 1, y: 1, progress: -1 }))).toThrow(SaveError);
  });

  it('очередь ручного крафта сохраняется и валидируется', () => {
    const state = factory();
    state.craftQueue = [{ recipe: 'ironGear', progress: 5 }];
    const loaded = roundtrip(state);
    expect(loaded.craftQueue).toEqual(state.craftQueue);
    expect(hash(loaded)).toBe(hash(state));
    const bad = (change: (job: any) => void) =>
      tamper((s) => {
        s.craftQueue = [{ recipe: 'ironGear', progress: 5 }];
        change(s.craftQueue[0]);
      });
    expect(() => deserialize(bad((j) => (j.recipe = 'nope')))).toThrow(/неизвестный рецепт «nope»/);
    expect(() => deserialize(bad((j) => (j.recipe = 'smeltIron')))).toThrow(SaveError);
    expect(() => deserialize(bad((j) => (j.progress = -1)))).toThrow(SaveError);
    expect(() => deserialize(bad((j) => (j.progress = 9999)))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => delete s.craftQueue))).toThrow(SaveError);
  });

  it('фильтр фильтрующего разделителя сохраняется и валидируется', () => {
    const state = createState(3, { width: 8, height: 8 });
    state.inventory = [{ item: 'filterSplitter', count: 1 }];
    runTicks(state, [{ tick: 0, command: { type: 'build', building: 'filterSplitter', x: 2, y: 2, dir: 1 } }], 1);
    const id = Object.values(state.buildings)[0]!.id;
    runTicks(state, [{ tick: 1, command: { type: 'setFilter', building: id, item: 'coal' } }], 2);
    const loaded = roundtrip(state);
    expect(loaded.buildings[id]!.filter).toBe('coal');
    expect(hash(loaded)).toBe(hash(state));
    const file = JSON.parse(serialize(state));
    file.state.buildings[id].filter = 'nope';
    expect(() => deserialize(JSON.stringify(file))).toThrow(/нет в игре/);
  });

  it('рецепт сборщика сохраняется; рецепт чужого здания не принимается', () => {
    const state = createState(3, { width: 8, height: 8 });
    state.inventory = [
      { item: 'assembler', count: 1 },
      { item: 'pole', count: 1 },
      { item: 'generator', count: 1 },
    ];
    const layout = [build('assembler', 0, 0), build('pole', 3, 1), build('generator', 4, 0)];
    runTicks(state, layout.map((command) => ({ tick: 0, command })), 1);
    const asm = Object.values(state.buildings)[0]!;
    Object.values(state.buildings).find((b) => b.type === 'generator')!.fuel = { item: 'coal', count: 5 };
    runTicks(state, [{ tick: 1, command: { type: 'setRecipe', building: asm.id, recipe: 'circuit' } }], 1);
    asm.input = [
      { item: 'ironPlate', count: 1 },
      { item: 'copperCable', count: 3 },
    ];
    // Цикл начат: на входе остались пустые стеки, они не должны мешать сохранению.
    runTicks(state, [], 10);
    expect(asm.input.every((s) => s.count === 0)).toBe(true);
    const loaded = roundtrip(state);
    expect(Object.values(loaded.buildings)[0]!.recipe).toBe('circuit');
    expect(hash(loaded)).toBe(hash(state));
  });

  it('рецепт, который делается в другом здании, не принимается', () => {
    const text = tamper((s) => {
      Object.values<any>(s.buildings).find((b) => b.type === 'furnace').recipe = 'ironGear';
    });
    expect(() => deserialize(text)).toThrow(SaveError);
  });

  describe('рецепт и вход крафтера', () => {
    // Печь приводится к известному состоянию: рецепт и по стопке на ингредиент.
    const furnace = (s: any) => Object.values<any>(s.buildings).find((b) => b.type === 'furnace');
    const withFurnace = (change: (f: any) => void): string =>
      tamper((s) => {
        const f = furnace(s);
        f.recipe = 'smeltIron';
        f.input = [{ item: 'ironOre', count: 1 }];
        change(f);
      });

    it('согласованные рецепт и вход проходят, в том числе пустая стопка', () => {
      expect(() => deserialize(withFurnace(() => {}))).not.toThrow();
      expect(() => deserialize(withFurnace((f) => (f.input[0].count = 0)))).not.toThrow();
      // Печь без цикла: ни рецепта, ни входа.
      expect(() => deserialize(tamper((s) => { delete furnace(s).recipe; delete furnace(s).input; }))).not.toThrow();
    });

    it('рецепт без входа отклоняется', () => {
      const text = withFurnace((f) => delete f.input);
      expect(() => deserialize(text)).toThrow(SaveError);
      expect(() => deserialize(text)).toThrow(/нет входа для рецепта «smeltIron»/);
    });

    it('рецепт с пустым списком входа или без стопки ингредиента отклоняется', () => {
      expect(() => deserialize(withFurnace((f) => (f.input = [])))).toThrow(/нет стопки для «ironOre»/);
      expect(() => deserialize(withFurnace((f) => (f.input = [{ item: 'coal', count: 0 }])))).toThrow(SaveError);
    });

    it('у сборщика должна быть стопка на каждый ингредиент рецепта', () => {
      const state = createState(3, { width: 8, height: 8 });
      state.inventory = [{ item: 'assembler', count: 1 }];
      runTicks(state, [{ tick: 0, command: build('assembler', 0, 0) }], 1);
      const asm = Object.values(state.buildings)[0]!;
      // Сборщик без рецепта: ни recipe, ни input — это нормальное состояние.
      expect(() => roundtrip(state)).not.toThrow();
      runTicks(state, [{ tick: 1, command: { type: 'setRecipe', building: asm.id, recipe: 'circuit' } }], 1);
      expect(asm.input).toEqual([{ item: 'ironPlate', count: 0 }, { item: 'copperCable', count: 0 }]);
      expect(() => roundtrip(state)).not.toThrow();
      asm.input = [{ item: 'ironPlate', count: 0 }];
      expect(() => roundtrip(state)).toThrow(/нет стопки для «copperCable»/);
    });

    it('вход без рецепта отклоняется', () => {
      const text = tamper((s) => {
        delete furnace(s).recipe;
        furnace(s).input = [{ item: 'ironOre', count: 0 }];
      });
      expect(() => deserialize(text)).toThrow(SaveError);
      expect(() => deserialize(text)).toThrow(/вход без рецепта/);
    });

    it('стопка не из рецепта и дубль стопки отклоняются', () => {
      expect(() => deserialize(withFurnace((f) => f.input.push({ item: 'coal', count: 1 })))).toThrow(
        /стопка «coal» не из рецепта «smeltIron»/,
      );
      expect(() => deserialize(withFurnace((f) => f.input.push({ item: 'ironOre', count: 1 })))).toThrow(
        /повторная стопка «ironOre»/,
      );
    });
  });

  it('усечённые массивы карты и пропавшие поля', () => {
    expect(() => deserialize(tamper((s) => s.map.tiles.pop()))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => delete s.map))).toThrow(SaveError);
    expect(() => deserialize(tamper((s) => delete s.inventory))).toThrow(SaveError);
    expect(() => deserialize('{"version":1,"state":null}')).toThrow(SaveError);
  });
});
