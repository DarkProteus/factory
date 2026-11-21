import { MINING_TICKS } from "@factory/content";
import { palette } from "@factory/render";
import {
  applyCommand,
  buildingAt,
  createState,
  hash,
  tick,
  type SimState,
} from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  applyKey,
  cellAt,
  clickCommand,
  CommandQueue,
  dropEmptyTool,
  ghostAnchor,
  itemCount,
  NO_TOOL,
  overlayFor,
  miningStep,
  rotateDir,
  selectBuilding,
  visibleBuildingIds,
  type ToolState,
} from "./input";
import themeCss from "./ui/theme.css?raw";

const idle: ToolState = { tool: NO_TOOL, dir: 0 };
const drill: ToolState = { tool: { kind: "build", building: "drill" }, dir: 0 };
/** Постройка тратит предмет-здание, поэтому в инвентаре лежит по одному каждого вида, которое нужно тестам. */
const world = (): SimState => {
  const state = createState(1, { width: 16, height: 16 });
  for (const item of ["drill", "chest"])
    state.inventory.push({ item, count: 2 });
  return state;
};

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

describe("очередь команд", () => {
  it("отдаёт команды по порядку и очищается", () => {
    const q = new CommandQueue();
    q.push({ type: "demolish", x: 1, y: 1 });
    q.push({ type: "demolish", x: 2, y: 2 });
    expect(q.length).toBe(2);
    expect(q.drain()).toEqual([
      { type: "demolish", x: 1, y: 1 },
      { type: "demolish", x: 2, y: 2 },
    ]);
    expect(q.drain()).toEqual([]);
  });
});

describe("клик и оверлей", () => {
  it("клик со зданием даёт build с якорем и выбранным направлением", () => {
    const s: ToolState = { ...drill, dir: 2 };
    expect(clickCommand(world(), s, { x: 5, y: 5 })).toEqual({
      type: "build",
      building: "drill",
      x: 4,
      y: 4,
      dir: 2,
    });
  });

  it("клик по занятому месту и без инструмента команды не даёт", () => {
    const state = world();
    applyCommand(state, {
      type: "build",
      building: "chest",
      x: 5,
      y: 5,
      dir: 0,
    });
    expect(clickCommand(state, drill, { x: 5, y: 5 })).toBeNull();
    expect(clickCommand(state, idle, { x: 5, y: 5 })).toBeNull();
  });

  it("снос даёт demolish по клетке под курсором", () => {
    expect(
      clickCommand(
        world(),
        { tool: { kind: "demolish" }, dir: 0 },
        { x: 3, y: 4 },
      ),
    ).toEqual({
      type: "demolish",
      x: 3,
      y: 4,
    });
  });

  it("призрак показывает ok на свободном месте и bad на занятом и за краем карты", () => {
    const state = world();
    applyCommand(state, {
      type: "build",
      building: "chest",
      x: 5,
      y: 5,
      dir: 0,
    });
    const ghost = (x: number, y: number) =>
      overlayFor(state, drill, { x, y })?.ghost;
    expect(ghost(9, 9)).toMatchObject({ x: 8, y: 8, valid: true });
    expect(ghost(5, 5)?.valid).toBe(false);
    expect(ghost(0, 0)?.valid).toBe(false);
    expect(overlayFor(state, drill, { x: 9, y: 9 })?.grid).toBe(true);
    expect(overlayFor(state, drill, null)).toBeNull();
  });

  it("без инструмента — рамка, в режиме сноса — рамка сноса, без призрака", () => {
    const state = world();
    expect(overlayFor(state, idle, { x: 1, y: 2 })).toEqual({
      highlight: { x: 1, y: 2, demolish: false },
      grid: false,
    });
    const o = overlayFor(
      state,
      { tool: { kind: "demolish" }, dir: 0 },
      { x: 1, y: 2 },
    );
    expect(o?.highlight?.demolish).toBe(true);
    expect(o?.ghost).toBeUndefined();
  });
});

describe("интерфейс не меняет состояние напрямую", () => {
  it("clickCommand и overlayFor состояние не трогают, оно меняется только на тике по очереди", () => {
    const state = world();
    const before = hash(state);
    const queue = new CommandQueue();
    const cmd = clickCommand(state, drill, { x: 5, y: 5 });
    overlayFor(state, drill, { x: 5, y: 5 });
    expect(hash(state)).toBe(before);
    queue.push(cmd!);
    expect(buildingAt(state, 4, 4)).toBeNull();
    tick(state, queue.drain());
    expect(buildingAt(state, 4, 4)?.type).toBe("drill");
    tick(state, queue.drain());
    expect(Object.keys(state.buildings)).toHaveLength(1);
  });

  it("снос через очередь убирает здание под курсором", () => {
    const state = world();
    applyCommand(state, {
      type: "build",
      building: "drill",
      x: 4,
      y: 4,
      dir: 0,
    });
    const queue = new CommandQueue();
    queue.push(
      clickCommand(
        state,
        { tool: { kind: "demolish" }, dir: 0 },
        { x: 5, y: 5 },
      )!,
    );
    expect(buildingAt(state, 5, 5)).not.toBeNull();
    tick(state, queue.drain());
    expect(buildingAt(state, 5, 5)).toBeNull();
  });

  it("исходники интерфейса не вызывают мутаторов sim", () => {
    const forbidden =
      /\b(applyCommand|placeBuilding|demolishAt|pushToBelt|createMap)\b|\.(buildings|map|inventory)\s*(=[^=]|\[[^\]]*\]\s*=[^=])/;
    const sources = Object.entries(
      import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.ts"], {
        query: "?raw",
        import: "default",
        eager: true,
      }),
    );
    expect(sources.length).toBeGreaterThan(3);
    for (const [file, text] of sources)
      expect(text, file).not.toMatch(forbidden);
  });
});

describe("тема интерфейса", () => {
  it("CSS-переменные совпадают с палитрой render", () => {
    const vars = new Map(
      [...themeCss.matchAll(/--([a-z0-9-]+):\s*#([0-9a-fA-F]{6})/g)].map(
        (m) => [m[1]!, parseInt(m[2]!, 16)],
      ),
    );
    for (const [token, color] of Object.entries(palette))
      expect(vars.get(token), `--${token}`).toBe(color);
  });
});
