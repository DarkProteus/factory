import { palette } from "@factory/render";
import { applyCommand, buildingAt, hash, tick } from "@factory/sim";
import { describe, expect, it } from "vitest";
import { clickCommand, CommandQueue, overlayFor, type ToolState } from "./input";
import { drill, idle, world } from "./input.testkit";
import themeCss from "./ui/theme.css?raw";

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
