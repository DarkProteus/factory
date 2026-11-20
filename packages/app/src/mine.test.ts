import { MINING_TICKS } from "@factory/content";
import { createState, tick, type SimState } from "@factory/sim";
import { describe, expect, it } from "vitest";
import {
  applyKey,
  clickCommand,
  CommandQueue,
  miningStep,
  NO_TOOL,
  selectMine,
  type ToolState,
} from "./input";

const idle: ToolState = { tool: NO_TOOL, dir: 0 };
const drill: ToolState = { tool: { kind: "build", building: "drill" }, dir: 0 };
const world = (): SimState => createState(1, { width: 16, height: 16 });

describe("кирка: инструмент", () => {
  const mine: ToolState = { tool: { kind: "mine" }, dir: 0 };
  const demolish: ToolState = { tool: { kind: "demolish" }, dir: 0 };

  it("M включает кирку, повторное нажатие и Esc снимают её", () => {
    const a = applyKey(idle, "KeyM");
    expect(a.tool).toEqual({ kind: "mine" });
    expect(applyKey(a, "KeyM").tool).toEqual(NO_TOOL);
    expect(applyKey(a, "Escape").tool).toEqual(NO_TOOL);
    expect(selectMine(idle).tool).toEqual({ kind: "mine" });
  });

  it("кирка и стройка/снос вытесняют друг друга в обе стороны", () => {
    expect(applyKey(drill, "KeyM").tool).toEqual({ kind: "mine" });
    expect(applyKey(demolish, "KeyM").tool).toEqual({ kind: "mine" });
    expect(applyKey(mine, "Digit1", ["drill"]).tool).toEqual({
      kind: "build",
      building: "drill",
    });
    expect(applyKey(mine, "KeyX").tool).toEqual({ kind: "demolish" });
  });

  it("клик киркой не строит и не сносит", () => {
    expect(clickCommand(world(), mine, { x: 3, y: 3 })).toBeNull();
  });

  it("направление не теряется при смене инструмента", () => {
    expect(applyKey({ ...drill, dir: 3 }, "KeyM").dir).toBe(3);
  });
});

describe("кирка: зажатая кнопка мыши", () => {
  const mine: ToolState = { tool: { kind: "mine" }, dir: 0 };
  const ore = (): SimState =>
    createState(1, {
      width: 8,
      height: 8,
      deposits: [
        { x: 3, y: 3, item: "ironOre", amount: 5 },
        { x: 4, y: 3, item: "coal", amount: 5 },
      ],
    });
  const a = { x: 3, y: 3 };
  const b = { x: 4, y: 3 };

  it("зажатая кнопка на залежи шлёт startMining один раз", () => {
    const state = ore();
    const first = miningStep(state, mine, null, true, a);
    expect(first.command).toEqual({ type: "startMining", x: 3, y: 3 });
    expect(first.mined).toEqual(a);
    const again = miningStep(state, mine, first.mined, true, { ...a });
    expect(again).toEqual({ mined: a, command: null });
  });

  it("отпускание кнопки шлёт stopMining", () => {
    expect(miningStep(ore(), mine, a, false, a)).toEqual({
      mined: null,
      command: { type: "stopMining" },
    });
  });

  it("уход с клетки на пустую, за канвас или за карту шлёт stopMining", () => {
    expect(miningStep(ore(), mine, a, true, { x: 0, y: 0 }).command).toEqual({
      type: "stopMining",
    });
    expect(miningStep(ore(), mine, a, true, null).command).toEqual({
      type: "stopMining",
    });
    expect(miningStep(ore(), mine, a, true, { x: -1, y: 99 }).command).toEqual({
      type: "stopMining",
    });
  });

  it("переход на соседнюю залежь шлёт startMining новой клетки", () => {
    const next = miningStep(ore(), mine, a, true, b);
    expect(next.command).toEqual({ type: "startMining", x: 4, y: 3 });
    expect(next.mined).toEqual(b);
  });

  it("на пустой клетке и без кирки добыча не начинается", () => {
    expect(miningStep(ore(), mine, null, true, { x: 0, y: 0 })).toEqual({
      mined: null,
      command: null,
    });
    expect(miningStep(ore(), idle, null, true, a)).toEqual({
      mined: null,
      command: null,
    });
    expect(miningStep(ore(), mine, null, false, a)).toEqual({
      mined: null,
      command: null,
    });
  });

  it("смена инструмента во время добычи шлёт stopMining", () => {
    expect(miningStep(ore(), drill, a, true, a).command).toEqual({
      type: "stopMining",
    });
  });

  it("через очередь и тики руда попадает в инвентарь, после отпускания добыча стоит", () => {
    const state = ore();
    const queue = new CommandQueue();
    let mined: { x: number; y: number } | null = null;
    const step = (down: boolean) => {
      const r = miningStep(state, mine, mined, down, a);
      mined = r.mined;
      if (r.command) queue.push(r.command);
    };
    step(true);
    for (let t = 0; t < MINING_TICKS; t++) tick(state, queue.drain());
    expect(state.inventory).toEqual([{ item: "ironOre", count: 1 }]);
    step(false);
    tick(state, queue.drain());
    expect(state.mining).toBeNull();
  });
});
