import { describe, expect, it } from 'vitest';
import { createState, hash, runTicks, tick } from '@factory/sim';
import { deserialize, SaveError, serialize } from './index';
import { build, factory, roundtrip } from './index.testkit';

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

