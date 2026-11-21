import { INVENTORY_SLOTS, items } from "@factory/content";
import { createState, POWER_SCALE, tick, type PlacedBuilding, type SimState } from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  applyWindowKey,
  buildingProgress,
  buildingSections,
  buildingStatus,
  energyLine,
  filterChoices,
  filterCommand,
  hasBuildingWindow,
  putCommand,
  recipeChoices,
  recipeCommand,
  takeCommand,
  windowTarget,
} from "./buildingUi";
import { NO_TOOL } from "./input";

/** Состояние с одним зданием type в клетке (2, 2); залежь железа только по запросу. */
function setup(type: string, deposit = false): { state: SimState; b: PlacedBuilding } {
  const state = createState(1, {
    width: 16,
    height: 16,
    deposits: deposit ? [{ x: 2, y: 2, item: "ironOre", amount: 100 }] : [],
  });
  state.inventory.push({ item: type, count: 1 });
  tick(state, [{ type: "build", building: type, x: 2, y: 2, dir: 0 }]);
  return { state, b: Object.values(state.buildings)[0]! };
}

const stack = (item: string, count: number) => ({ item, count });

describe("клик по зданию", () => {
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

describe("окна: инвентарь и здание взаимоисключающие", () => {
  it("E и Esc закрывают окно здания", () => {
    const open = { inventory: false, building: 3 };
    expect(applyWindowKey(open, "KeyE")).toEqual({ inventory: false, building: null });
    expect(applyWindowKey(open, "Escape")).toEqual({ inventory: false, building: null });
    expect(applyWindowKey(open, "KeyM")).toBe(open);
  });

  it("E без окна открывает инвентарь, Esc закрывает", () => {
    const closed = { inventory: false, building: null };
    const inv = applyWindowKey(closed, "KeyE");
    expect(inv).toEqual({ inventory: true, building: null });
    expect(applyWindowKey(inv, "Escape")).toEqual(closed);
    expect(applyWindowKey(closed, "KeyM")).toBe(closed);
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

describe("команды по клику", () => {
  it("ячейка здания — takeFromBuilding, пустая — ничего", () => {
    const { state, b } = setup("furnace");
    b.output = stack("ironPlate", 3);
    const [, , out] = buildingSections(b);
    const cmd = takeCommand(b, out!.cells[0]!);
    expect(cmd).toEqual({ type: "takeFromBuilding", building: b.id, slot: { kind: "output" } });
    tick(state, [cmd!]);
    expect(b.output).toBeNull();
    expect(state.inventory.find((s) => s.item === "ironPlate")?.count).toBe(3);
    expect(takeCommand(b, buildingSections(b)[0]!.cells[0]!)).toBeNull();
  });

  it("ячейка инвентаря — putIntoBuilding всей стопкой", () => {
    const { state, b } = setup("chest");
    state.inventory.push(stack("ironPlate", 12));
    const cmd = putCommand(b, stack("ironPlate", 12));
    expect(cmd).toEqual({ type: "putIntoBuilding", building: b.id, item: "ironPlate", count: 12 });
    tick(state, [cmd!]);
    expect(b.slots).toEqual([stack("ironPlate", 12)]);
    expect(state.inventory.find((s) => s.item === "ironPlate")).toBeUndefined();
  });

  it("здание не принимает предмет — команды нет", () => {
    const { b } = setup("generator");
    expect(putCommand(b, stack("ironPlate", 5))).toBeNull();
    expect(putCommand(b, stack("coal", 5))).not.toBeNull();
    expect(putCommand(b, null)).toBeNull();
    expect(putCommand(setup("drill").b, stack("coal", 1))).toBeNull();
  });
});

describe("выбор рецепта сборщика", () => {
  it("показывает рецепты сборщика, выбранный отмечен", () => {
    const { state, b } = setup("assembler");
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "ironGear" }]);
    const choices = recipeChoices(state.inventory, b);
    expect(choices.every((c) => c.def.madeIn === "assembler")).toBe(true);
    expect(choices.find((c) => c.selected)?.id).toBe("ironGear");
    expect(choices.every((c) => c.available)).toBe(true);
  });

  it("клик по другому рецепту — setRecipe, по выбранному — ничего", () => {
    const { state, b } = setup("assembler");
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "ironGear" }]);
    const choices = recipeChoices(state.inventory, b);
    const circuit = choices.find((c) => c.id === "circuit")!;
    expect(recipeCommand(b, circuit)).toEqual({ type: "setRecipe", building: b.id, recipe: "circuit" });
    expect(recipeCommand(b, choices.find((c) => c.selected)!)).toBeNull();
  });

  it("недоступен, если содержимое не поместится в инвентарь", () => {
    const { state, b } = setup("assembler");
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "ironGear" }]);
    b.output = stack("ironGear", 40);
    // Инвентарь забит предметами другого вида.
    state.inventory = Array.from({ length: INVENTORY_SLOTS }, () => stack("stone", items.stone.stack));
    const choices = recipeChoices(state.inventory, b);
    const circuit = choices.find((c) => c.id === "circuit")!;
    expect(circuit.available).toBe(false);
    expect(recipeCommand(b, circuit)).toBeNull();
    expect(choices.find((c) => c.selected)!.available).toBe(true);
  });
});

describe("фильтрующий разделитель: окно (TASK-37)", () => {
  it("варианты фильтра: «без фильтра» и все предметы content, выбранный отмечен", () => {
    const { b } = setup("filterSplitter");
    const none = filterChoices(b);
    expect(none[0]).toEqual({ item: null, selected: true });
    expect(none.slice(1).map((c) => c.item)).toEqual(Object.keys(items));
    expect(none.slice(1).some((c) => c.selected)).toBe(false);
    b.filter = "coal";
    const coal = filterChoices(b);
    expect(coal[0]!.selected).toBe(false);
    expect(coal.filter((c) => c.selected).map((c) => c.item)).toEqual(["coal"]);
  });

  it("у других зданий вариантов фильтра нет", () => {
    for (const type of ["splitter", "chest", "assembler"]) expect(filterChoices(setup(type).b)).toEqual([]);
  });

  it("клик по другому предмету шлёт setFilter, по выбранному — ничего, «без фильтра» снимает", () => {
    const { b } = setup("filterSplitter");
    expect(filterCommand(b, "coal")).toEqual({ type: "setFilter", building: b.id, item: "coal" });
    expect(filterCommand(b, null)).toBeNull();
    b.filter = "coal";
    expect(filterCommand(b, "coal")).toBeNull();
    expect(filterCommand(b, "ironOre")).toEqual({ type: "setFilter", building: b.id, item: "ironOre" });
    expect(filterCommand(b, null)).toEqual({ type: "setFilter", building: b.id, item: null });
  });

  it("команда меняет состояние sim, статуса, прогресса и секций у разделителя нет", () => {
    const { state, b } = setup("filterSplitter");
    tick(state, [filterCommand(b, "coal")!]);
    expect(b.filter).toBe("coal");
    expect(buildingStatus(state, b, undefined)).toBeNull();
    expect(buildingProgress(b)).toBeNull();
    expect(buildingSections(b)).toEqual([]);
  });

  it("клик по инвентарю не кладёт предметы в разделитель", () => {
    const { b } = setup("filterSplitter");
    expect(putCommand(b, stack("coal", 5))).toBeNull();
  });
});

describe("окно лаборатории", () => {
  const lab = () => setup("lab");

  it("открывается кликом", () => {
    const { state, b } = lab();
    expect(windowTarget(state, NO_TOOL, { x: 2, y: 2 })).toBe(b.id);
  });

  it("статус: нет исследования, нет пакетов, нет энергии, исследует", () => {
    const { state, b } = lab();
    expect(buildingStatus(state, b, undefined)).toEqual({ label: "Нет исследования", lamp: "off" });
    state.research.active = "logistics";
    expect(buildingStatus(state, b, POWER_SCALE)?.label).toBe("Ждёт: нет пакетов");
    b.input = [stack("sciencePackRed", 3)];
    expect(buildingStatus(state, b, 0)?.label).toBe("Нет энергии");
    expect(buildingStatus(state, b, POWER_SCALE)).toEqual({ label: "Исследует", lamp: "work" });
  });

  it("ПАКЕТЫ: ячейка на каждый вид пакета, пустые видны; прогресс — доля единицы", () => {
    const { b } = lab();
    b.input = [stack("sciencePackRed", 3)];
    const [section] = buildingSections(b);
    expect(section!.title).toBe("ПАКЕТЫ");
    expect(section!.cells.map((c) => c.wants)).toEqual(["sciencePackRed", "sciencePackGreen"]);
    expect(section!.cells[0]!.slot).toEqual({ kind: "input", index: 0 });
    expect(section!.cells[1]!.slot).toBeNull();
    expect(buildingProgress(b)).toBe(0);
    b.unit = "logistics";
    b.progress = 300;
    expect(buildingProgress(b)).toBe(0.5);
  });

  it("putCommand кладёт только пакеты активной технологии", () => {
    const { b } = lab();
    expect(putCommand(b, stack("sciencePackRed", 5))).toBeNull();
    expect(putCommand(b, stack("sciencePackRed", 5), undefined, "logistics")).toEqual({ type: "putIntoBuilding", building: b.id, item: "sciencePackRed", count: 5 });
    expect(putCommand(b, stack("sciencePackGreen", 5), undefined, "logistics")).toBeNull();
  });
});
