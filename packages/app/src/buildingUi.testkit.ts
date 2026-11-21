import { createState, tick, type PlacedBuilding, type SimState } from "@factory/sim";

/** Состояние с одним зданием type в клетке (2, 2); залежь железа только по запросу. */
export function setup(type: string, deposit = false): { state: SimState; b: PlacedBuilding } {
  const state = createState(1, {
    width: 16,
    height: 16,
    deposits: deposit ? [{ x: 2, y: 2, item: "ironOre", amount: 100 }] : [],
  });
  state.inventory.push({ item: type, count: 1 });
  tick(state, [{ type: "build", building: type, x: 2, y: 2, dir: 0 }]);
  return { state, b: Object.values(state.buildings)[0]! };
}

export const stack = (item: string, count: number) => ({ item, count });
