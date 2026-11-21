import { createState, type SimState } from "@factory/sim";
import { NO_TOOL, type ToolState } from "./input";

export const idle: ToolState = { tool: NO_TOOL, dir: 0 };
export const drill: ToolState = { tool: { kind: "build", building: "drill" }, dir: 0 };
/** Постройка тратит предмет-здание, поэтому в инвентаре лежит по одному каждого вида, которое нужно тестам. */
export const world = (): SimState => {
  const state = createState(1, { width: 16, height: 16 });
  for (const item of ["drill", "chest"])
    state.inventory.push({ item, count: 2 });
  return state;
};
