import { describe, expect, it } from 'vitest';
import { buildingAt, createState, pushToBelt, tick, type Command, type Dir, type PlacedBuilding, type SimState } from './index';
import { electrify, stocked } from './testKit';

const b = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });
const at = (state: SimState, x: number, y: number): PlacedBuilding => buildingAt(state, x, y)!;

function build(cmds: Command[]): SimState {
  const state = stocked(createState(1, { width: 16, height: 16 }));
  tick(state, cmds);
  return state;
}

function run(state: SimState, ticks: number): void {
  electrify(state);
  for (let i = 0; i < ticks; i++) tick(state, []);
}

const count = (p: PlacedBuilding): number => (p.slots ?? []).reduce((s, st) => s + st.count, 0);

describe('манипулятор и разделитель', () => {
  for (const splitter of ['splitter', 'filterSplitter']) {
    it(`${splitter}: манипулятор забирает из буфера без выходных лент`, () => {
      // лента → разделитель → манипулятор (вниз) → сундук
      const state = build([b('belt', 0, 0), b(splitter, 1, 0), b('inserter', 1, 1, 2), b('chest', 1, 2)]);
      for (let i = 0; i < 3; i++) {
        expect(pushToBelt(at(state, 0, 0), 'ironOre')).toBe(true);
        run(state, 200);
      }
      expect(count(at(state, 1, 2))).toBe(3);
      expect(at(state, 1, 0).belt ?? []).toEqual([]);
      expect(at(state, 1, 1).output).toBeNull();
    });
  }

  it('манипулятор кладёт в разделитель, предмет уходит на выходную ленту', () => {
    // сундук → манипулятор (вправо) → разделитель → лента
    const state = build([b('chest', 0, 0), b('inserter', 1, 0), b('splitter', 2, 0), b('belt', 3, 0), b('belt', 4, 0)]);
    at(state, 0, 0).slots = [{ item: 'ironOre', count: 3 }];
    run(state, 300);
    const onBelts = [...(at(state, 3, 0).belt ?? []), ...(at(state, 4, 0).belt ?? [])].length;
    const inSplitter = (at(state, 2, 0).belt ?? []).length;
    const inHand = at(state, 1, 0).output ? 1 : 0;
    expect(count(at(state, 0, 0))).toBe(0);
    expect(onBelts + inSplitter + inHand).toBe(3);
    expect(onBelts).toBeGreaterThan(0);
  });
});
