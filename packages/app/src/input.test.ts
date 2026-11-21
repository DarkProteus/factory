import { applyCommand, createState } from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  applyKey,
  cellAt,
  clickCommand,
  dropEmptyTool,
  ghostAnchor,
  itemCount,
  NO_TOOL,
  rotateDir,
  selectBuilding,
  visibleBuildingIds,
  type ToolState,
} from "./input";
import { drill, idle, world } from "./input.testkit";

describe("клетка под курсором", () => {
  it("делит мировые координаты на размер клетки, отрицательные уходят вниз", () => {
    expect(cellAt(0, 0)).toEqual({ x: 0, y: 0 });
    expect(cellAt(31.9, 32)).toEqual({ x: 0, y: 1 });
    expect(cellAt(-0.1, -32)).toEqual({ x: -1, y: -1 });
  });
});

describe("якорь призрака", () => {
  it("у 1×1 совпадает с клеткой", () => {
    expect(ghostAnchor({ x: 5, y: 7 }, [1, 1], 0)).toEqual({ x: 5, y: 7 });
  });

  it("у 2×2 курсор на центре отпечатка: сдвиг на клетку", () => {
    for (const dir of [0, 1, 2, 3] as const)
      expect(ghostAnchor({ x: 5, y: 7 }, [2, 2], dir)).toEqual({ x: 4, y: 6 });
  });

  it("отпечаток учитывает поворот неквадратного здания", () => {
    expect(ghostAnchor({ x: 5, y: 7 }, [3, 1], 0)).toEqual({ x: 4, y: 7 });
    expect(ghostAnchor({ x: 5, y: 7 }, [3, 1], 1)).toEqual({ x: 5, y: 6 });
  });
});

describe("клавиши", () => {
  const ids = ["drill", "belt", "furnace"];

  it("цифры выбирают здания по порядку, повторное нажатие снимает выбор", () => {
    const a = applyKey(idle, "Digit2", ids);
    expect(a.tool).toEqual({ kind: "build", building: "belt" });
    expect(applyKey(a, "Digit2", ids).tool).toEqual(NO_TOOL);
    expect(applyKey(idle, "Digit9", ids)).toBe(idle);
  });

  it("X — снос, Esc снимает инструмент", () => {
    const a = applyKey(drill, "KeyX", ids);
    expect(a.tool).toEqual({ kind: "demolish" });
    expect(applyKey(a, "Escape", ids).tool).toEqual(NO_TOOL);
  });

  it("R крутит по часовой и держит направление при смене здания", () => {
    let s = idle;
    for (const want of [1, 2, 3, 0]) {
      s = applyKey(s, "KeyR", ids);
      expect(s.dir).toBe(want);
    }
    expect(rotateDir(3)).toBe(0);
    expect(applyKey({ ...drill, dir: 2 }, "Digit3", ids).dir).toBe(2);
  });

  it("чужие клавиши не меняют состояние", () => {
    expect(applyKey(drill, "KeyW", ids)).toBe(drill);
  });
});

describe("предметы-здания в инвентаре", () => {
  it("itemCount суммирует стеки предмета и даёт 0 для отсутствующего", () => {
    const inv = [
      { item: "drill", count: 3 },
      { item: "chest", count: 1 },
      { item: "drill", count: 2 },
    ];
    expect(itemCount(inv, "drill")).toBe(5);
    expect(itemCount(inv, "belt")).toBe(0);
  });

  it("здание с нулём предметов не выбирается ни кнопкой, ни клавишей", () => {
    const owned = (id: string) => (id === "belt" ? 0 : 4);
    expect(selectBuilding(idle, "belt", owned)).toBe(idle);
    expect(selectBuilding(idle, "drill", owned).tool).toEqual({
      kind: "build",
      building: "drill",
    });
    const ids = ["drill", "belt"];
    expect(applyKey(idle, "Digit2", ids, owned)).toBe(idle);
    expect(applyKey(idle, "Digit1", ids, owned).tool).toEqual({
      kind: "build",
      building: "drill",
    });
  });

  it("после последнего экземпляра режим стройки сбрасывается, остальные режимы и направление целы", () => {
    const state = world();
    const s: ToolState = { tool: { kind: "build", building: "drill" }, dir: 2 };
    expect(dropEmptyTool(state, s)).toBe(s);
    applyCommand(state, {
      type: "build",
      building: "drill",
      x: 2,
      y: 2,
      dir: 0,
    });
    expect(dropEmptyTool(state, s)).toBe(s);
    applyCommand(state, {
      type: "build",
      building: "drill",
      x: 5,
      y: 5,
      dir: 0,
    });
    expect(dropEmptyTool(state, s)).toEqual({ tool: NO_TOOL, dir: 2 });
    const demolish: ToolState = { tool: { kind: "demolish" }, dir: 1 };
    expect(dropEmptyTool(state, demolish)).toBe(demolish);
  });

  it("клик при нуле предметов команды не даёт", () => {
    const state = world();
    state.inventory = [];
    expect(clickCommand(state, drill, { x: 5, y: 5 })).toBeNull();
  });
});

describe("закрытые здания на панели стройки", () => {
  const ids = ["belt", "splitter", "lab"];

  it("здание с закрытым рецептом скрыто, с открытым и без рецепта — видно", () => {
    const state = createState(1);
    state.inventory = [];
    state.research.unlocked = ["belt"] as never;
    expect(visibleBuildingIds(state, ids, { belt: 1, splitter: 1 })).toEqual(["belt", "lab"]);
  });

  it("закрытое здание из инвентаря остаётся видимым и ставится", () => {
    const state = createState(1);
    state.research.unlocked = [] as never;
    state.inventory = [{ item: "splitter", count: 2 }];
    expect(visibleBuildingIds(state, ids, { belt: 1, splitter: 1 })).toEqual(["splitter", "lab"]);
  });

  it("после исследования рецепта здание появляется", () => {
    const state = createState(1);
    state.inventory = [];
    expect(visibleBuildingIds(state)).not.toContain("splitter");
    state.research.unlocked = [...state.research.unlocked, "splitter"] as never;
    expect(visibleBuildingIds(state)).toContain("splitter");
  });

  it("клавиши 1–9 идут по видимым зданиям", () => {
    const state = createState(1);
    state.inventory = [];
    const visible = visibleBuildingIds(state, ["splitter", "belt"], { splitter: 1, belt: 1 });
    expect(applyKey(idle, "Digit1", visible).tool).toEqual({ kind: "build", building: "belt" });
  });
});
