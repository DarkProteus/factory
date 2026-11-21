import { describe, expect, it } from 'vitest';
import { createState, tick, type Command, type SimState } from './index';
import { powerNetworks } from './network';
import { stocked } from './testKit';

const pole = (x: number, y: number): Command => ({ type: 'build', building: 'pole', x, y, dir: 1 });

/** Мир со столбами в заданных клетках; id столбов идут по порядку списка. */
function withPoles(cells: [number, number][]): SimState {
  const state = stocked(createState(1, { width: 40, height: 40 }));
  tick(state, cells.map(([x, y]) => pole(x, y)));
  return state;
}

const polesOf = (state: SimState) => Object.values(state.buildings).filter((b) => b.type === 'pole');

/** Сети по старому правилу «все пары в радиусе 7»: число компонент связности. */
function oldComponents(state: SimState): Map<number, number> {
  const poles = polesOf(state);
  const parent = new Map(poles.map((p) => [p.id, p.id]));
  const root = (id: number): number => (parent.get(id) === id ? id : root(parent.get(id)!));
  for (const a of poles) {
    for (const b of poles) {
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > 49) continue;
      const ra = root(a.id);
      const rb = root(b.id);
      parent.set(Math.max(ra, rb), Math.min(ra, rb));
    }
  }
  return new Map(poles.map((p) => [p.id, root(p.id)]));
}

/** Псевдослучайные клетки без повторов (детерминированно, без Math.random). */
function scatter(count: number, seed: number): [number, number][] {
  const seen = new Set<string>();
  const cells: [number, number][] = [];
  let s = seed;
  while (cells.length < count) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const x = 2 + (s >> 8) % 28;
    s = (s * 1103515245 + 12345) % 2147483648;
    const y = 2 + (s >> 8) % 28;
    if (seen.has(`${x},${y}`)) continue;
    seen.add(`${x},${y}`);
    cells.push([x, y]);
  }
  return cells;
}

const cross = (ox: number, oy: number, ax: number, ay: number, bx: number, by: number) => (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);

/** Пересекаются ли отрезки во внутренних точках (общий конец не считается). */
function crosses(state: SimState, w1: [number, number], w2: [number, number]): boolean {
  if (w1.some((id) => w2.includes(id))) return false;
  const [a, b] = w1.map((id) => state.buildings[id]!);
  const [c, d] = w2.map((id) => state.buildings[id]!);
  const d1 = cross(a!.x, a!.y, b!.x, b!.y, c!.x, c!.y);
  const d2 = cross(a!.x, a!.y, b!.x, b!.y, d!.x, d!.y);
  const d3 = cross(c!.x, c!.y, d!.x, d!.y, a!.x, a!.y);
  const d4 = cross(c!.x, c!.y, d!.x, d!.y, b!.x, b!.y);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// rule: pole-wires
describe('провода: минимальное остовное дерево', () => {
  it('число проводов = столбы − сети', () => {
    const state = withPoles(scatter(40, 7));
    const nets = powerNetworks(state);
    const netCount = new Set(nets.poleNet.values()).size;
    expect(netCount).toBeGreaterThan(1);
    expect(nets.wires.length).toBe(nets.poleNet.size - netCount);
  });

  it('связность сетей совпадает со старым правилом «все в радиусе 7»', () => {
    for (const seed of [1, 2, 3]) {
      const state = withPoles(scatter(40, seed));
      const nets = powerNetworks(state);
      expect(Object.fromEntries(nets.poleNet)).toEqual(Object.fromEntries(oldComponents(state)));
    }
  });

  it('на плотной сетке провода не идут крест-накрест', () => {
    const cells: [number, number][] = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) cells.push([4 + x * 2, 4 + y * 2]);
    for (const layout of [cells, scatter(50, 11)]) {
      const state = withPoles(layout);
      const { wires } = powerNetworks(state);
      for (let i = 0; i < wires.length; i++) {
        for (let j = i + 1; j < wires.length; j++) expect(crosses(state, wires[i]!, wires[j]!)).toBe(false);
      }
    }
    // Плотная сетка 8×8 с шагом 2: одна сеть, 63 провода вместо сотен.
    expect(powerNetworks(withPoles(cells)).wires.length).toBe(63);
  });

  it('равные расстояния решаются по паре id, результат повторяем', () => {
    // Квадрат со стороной 4: четыре равных ребра, лишнее — с наибольшей парой id (3, 4).
    const square: [number, number][] = [[10, 10], [14, 10], [14, 14], [10, 14]];
    const state = withPoles(square);
    const [p1, p2, p3, p4] = polesOf(state).map((p) => p.id);
    expect(powerNetworks(state).wires).toEqual([[p1, p2], [p1, p4], [p2, p3]]);
    expect(powerNetworks(withPoles(square)).wires).toEqual(powerNetworks(state).wires);
    expect(p4).toBeGreaterThan(p3!);
  });

  it('провода пересчитываются после сноса столба и постановки нового', () => {
    const state = withPoles([[10, 10], [14, 10]]);
    expect(powerNetworks(state).wires.length).toBe(1);
    tick(state, [pole(12, 10)]);
    const nets = powerNetworks(state);
    // Средний столб короче обоих: дерево — две короткие стороны, длинная пара выпала.
    expect(nets.wires.length).toBe(2);
    expect(new Set(nets.poleNet.values()).size).toBe(1);
  });
});
