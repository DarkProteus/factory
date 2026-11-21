import { POWER_SCALE, tick } from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  applyWindowKey,
  buildingProgress,
  buildingSections,
  buildingStatus,
  energyLine,
  hasBuildingWindow,
  windowTarget,
} from "./buildingUi";
import { setup, stack } from "./buildingUi.testkit";
import { NO_TOOL } from "./input";

describe("клик по зданию", () => {
  // rule: building-window
  it("открывает окно у бура, печи, сборщика, сундука, генератора и фильтрующего разделителя", () => {
    for (const type of ["drill", "furnace", "assembler", "chest", "generator", "filterSplitter"]) {
      const { state, b } = setup(type);
      expect(windowTarget(state, NO_TOOL, { x: 2, y: 2 })).toBe(b.id);
    }
  });

  it("не открывает у конвейера, разделителя, манипулятора, столба и пустой клетки", () => {
    for (const type of ["belt", "splitter", "inserter", "pole"]) {
      const { state } = setup(type);
      expect(windowTarget(state, NO_TOOL, { x: 2, y: 2 })).toBeNull();
    }
    expect(hasBuildingWindow(undefined)).toBe(false);
    const { state } = setup("chest");
    expect(windowTarget(state, NO_TOOL, { x: 9, y: 9 })).toBeNull();
  });

  it("не открывает при выбранном инструменте", () => {
    const { state } = setup("chest");
    const cell = { x: 2, y: 2 };
    expect(windowTarget(state, { kind: "demolish" }, cell)).toBeNull();
    expect(windowTarget(state, { kind: "build", building: "chest" }, cell)).toBeNull();
    expect(windowTarget(state, { kind: "mine" }, cell)).toBeNull();
  });
});

describe("окна: инвентарь, исследования и здание взаимоисключающие", () => {
  const closed = { inventory: false, research: false, building: null };

  it("E и Esc закрывают окно здания", () => {
    const open = { ...closed, building: 3 };
    expect(applyWindowKey(open, "KeyE")).toEqual(closed);
    expect(applyWindowKey(open, "Escape")).toEqual(closed);
    expect(applyWindowKey(open, "KeyM")).toBe(open);
  });

  it("E без окна открывает инвентарь, Esc закрывает", () => {
    const inv = applyWindowKey(closed, "KeyE");
    expect(inv).toEqual({ ...closed, inventory: true });
    expect(applyWindowKey(inv, "Escape")).toEqual(closed);
    expect(applyWindowKey(closed, "KeyM")).toBe(closed);
  });

  it("T открывает и закрывает исследования, Esc тоже закрывает", () => {
    const research = applyWindowKey(closed, "KeyT");
    expect(research).toEqual({ ...closed, research: true });
    expect(applyWindowKey(research, "KeyT")).toEqual(closed);
    expect(applyWindowKey(research, "Escape")).toEqual(closed);
  });

  it("открытие одного окна закрывает другое", () => {
    expect(applyWindowKey({ ...closed, inventory: true }, "KeyT")).toEqual({ ...closed, research: true });
    expect(applyWindowKey({ ...closed, research: true }, "KeyE")).toEqual({ ...closed, inventory: true });
    expect(applyWindowKey({ ...closed, building: 3 }, "KeyT")).toEqual({ ...closed, research: true });
  });
});

describe("статус и прогресс", () => {
  it("бур: нет залежи, работает, выход полон, нет энергии", () => {
    const none = setup("drill");
    expect(buildingStatus(none.state, none.b, POWER_SCALE)).toEqual({ label: "Нет залежи", lamp: "off" });
    const { state, b } = setup("drill", true);
    expect(buildingStatus(state, b, POWER_SCALE)).toEqual({ label: "Работает", lamp: "work" });
    expect(buildingStatus(state, b, 0)?.label).toBe("Нет энергии");
    expect(buildingStatus(state, b, undefined)?.label).toBe("Нет энергии");
    b.output = stack("ironOre", 5);
    expect(buildingStatus(state, b, POWER_SCALE)).toEqual({ label: "Ждёт: выход полон", lamp: "wait" });
  });

  it("бур: прогресс — доля miningTicks", () => {
    const { b } = setup("drill", true);
    b.progress = 30;
    expect(buildingProgress(b)).toBe(0.5);
  });

  it("сборщик: рецепт не выбран, нет входа, работает, нет энергии", () => {
    const { state, b } = setup("assembler");
    expect(buildingStatus(state, b, POWER_SCALE)).toEqual({ label: "Рецепт не выбран", lamp: "off" });
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "ironGear" }]);
    expect(buildingStatus(state, b, POWER_SCALE)).toEqual({ label: "Ждёт: нет входа", lamp: "wait" });
    expect(buildingStatus(state, b, undefined)?.label).toBe("Нет энергии");
    b.input![0]!.count = 2;
    expect(buildingStatus(state, b, POWER_SCALE)?.label).toBe("Работает");
    b.output = stack("ironGear", 50);
    expect(buildingStatus(state, b, POWER_SCALE)?.label).toBe("Ждёт: выход полон");
    b.output = null;
    b.progress = 15;
    expect(buildingProgress(b)).toBe(0.5);
  });

  it("печь: нет топлива важнее остального, потом нет входа и работает", () => {
    const { state, b } = setup("furnace");
    expect(buildingStatus(state, b, undefined)?.label).toBe("Нет топлива");
    b.fuel = stack("coal", 1);
    expect(buildingStatus(state, b, undefined)).toEqual({ label: "Ждёт: нет входа", lamp: "off" });
    b.recipe = "smeltIron";
    b.input = [stack("ironOre", 1)];
    expect(buildingStatus(state, b, undefined)?.label).toBe("Работает");
    b.progress = 90;
    expect(buildingProgress(b)).toBe(0.5);
  });

  it("генератор: нет топлива, нет нагрузки, работает; сундук без статуса и прогресса", () => {
    const { state, b } = setup("generator");
    expect(buildingStatus(state, b, undefined)?.label).toBe("Нет топлива");
    b.fuel = stack("coal", 5);
    expect(buildingStatus(state, b, undefined, 0)?.label).toBe("Нет нагрузки");
    expect(buildingStatus(state, b, undefined, 75)?.label).toBe("Работает");
    expect(buildingProgress(b)).toBeNull();
    const chest = setup("chest");
    expect(buildingStatus(chest.state, chest.b, undefined)).toBeNull();
    expect(buildingProgress(chest.b)).toBeNull();
  });
});

describe("энергия", () => {
  it("строка с мощностью и процентом; меньше 100 % и вне сети — bad", () => {
    const def = { energy: { kind: "electric", kw: 75 } } as never;
    expect(energyLine(def, POWER_SCALE)).toEqual({ text: "75 кВт · 100 %", bad: false });
    expect(energyLine(def, POWER_SCALE / 2)).toEqual({ text: "75 кВт · 50 %", bad: true });
    expect(energyLine(def, undefined)).toEqual({ text: "НЕТ СЕТИ", bad: true });
    expect(energyLine({ energy: { kind: "fuel", kw: 90 } } as never, 0)).toBeNull();
  });
});

describe("ячейки здания", () => {
  it("сундук: сетка всех ячеек, пустые видны", () => {
    const { b } = setup("chest");
    b.slots = [stack("ironPlate", 7)];
    const [grid] = buildingSections(b);
    expect(grid!.cells).toHaveLength(16);
    expect(grid!.cells[0]).toEqual({ slot: { kind: "slot", index: 0 }, stack: stack("ironPlate", 7) });
    expect(grid!.cells[1]).toEqual({ slot: null, stack: null });
  });

  it("сборщик: ячейка на каждый ингредиент (пустые тоже) и выход", () => {
    const { state, b } = setup("assembler");
    expect(buildingSections(b).map((s) => s.title)).toEqual(["Вход", "Выход"]);
    expect(buildingSections(b)[0]!.cells).toHaveLength(1);
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "circuit" }]);
    b.input![0]!.count = 3;
    b.output = stack("circuit", 2);
    const [input, output] = buildingSections(b);
    expect(input!.cells).toHaveLength(2);
    expect(input!.cells[0]).toMatchObject({ slot: { kind: "input", index: 0 }, stack: stack("ironPlate", 3) });
    expect(input!.cells[1]).toMatchObject({ slot: null, stack: null, wants: "copperCable" });
    expect(output!.cells[0]).toEqual({ slot: { kind: "output" }, stack: stack("circuit", 2) });
  });

  it("печь: вход, топливо, выход; без руды — одна пустая ячейка входа", () => {
    const { b } = setup("furnace");
    expect(buildingSections(b).map((s) => s.title)).toEqual(["Вход", "Топливо", "Выход"]);
    expect(buildingSections(b)[0]!.cells).toEqual([{ slot: null, stack: null }]);
    b.recipe = "smeltIron";
    b.input = [stack("ironOre", 2)];
    b.fuel = stack("coal", 4);
    const [input, fuel] = buildingSections(b);
    expect(input!.cells[0]!.slot).toEqual({ kind: "input", index: 0 });
    expect(fuel!.cells[0]).toEqual({ slot: { kind: "fuel" }, stack: stack("coal", 4) });
  });

  it("бур — только выход, генератор — только топливо", () => {
    expect(buildingSections(setup("drill").b).map((s) => s.title)).toEqual(["Выход"]);
    expect(buildingSections(setup("generator").b).map((s) => s.title)).toEqual(["Топливо"]);
  });
});
