import { INVENTORY_SLOTS, items } from "@factory/content";
import { POWER_SCALE, tick } from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  buildingProgress,
  buildingSections,
  buildingStatus,
  filterChoices,
  filterCommand,
  putCommand,
  recipeChoices,
  recipeCommand,
  takeCommand,
  windowTarget,
} from "./buildingUi";
import { setup, stack } from "./buildingUi.testkit";
import { NO_TOOL } from "./input";

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

  it("закрытые рецепты скрыты, выбранный остаётся", () => {
    const { state, b } = setup("assembler");
    tick(state, [{ type: "setRecipe", building: b.id, recipe: "ironGear" }]);
    const ids = recipeChoices(state.inventory, b, undefined, (id) => id === "circuit").map((c) => c.id);
    expect(ids).toEqual(["ironGear", "circuit"]);
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
