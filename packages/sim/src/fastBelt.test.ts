import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { BELT_CELL, BELT_GAP, buildingAt, createState, pushToBelt, tick, type Command, type PlacedBuilding, type SimState } from './index';
import { electrify, stocked } from './testKit';

/** Быстрые ленты и манипулятор (TASK-50): переходы между скоростями, пропускная способность, взмах. */

const speedOf = (type: string): number => (buildings as Record<string, BuildingDef>)[type]!.beltSpeed!;
const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: 1 });
const at = (s: SimState, x: number, y: number): PlacedBuilding => buildingAt(s, x, y)!;

/** Ряд зданий на восток от x = 1 в строке y = 5; kinds — тип каждой клетки. */
function line(kinds: string[], width = 24): SimState {
  const s = stocked(createState(1, { width, height: 16 }));
  tick(s, kinds.map((k, i) => build(k, 1 + i, 5)));
  return s;
}

describe('быстрые здания описаны в content', () => {
  it('скорости и взмах вдвое выше обычных', () => {
    expect(buildings.fastBelt.beltSpeed).toBe(buildings.belt.beltSpeed! * 2);
    expect(buildings.fastUndergroundBelt.beltSpeed).toBe(buildings.undergroundBelt.beltSpeed! * 2);
    expect(buildings.fastInserter.swingTicks).toBe(buildings.inserter.swingTicks! / 2);
  });
});

describe('переход между лентами разной скорости', () => {
  /** Все предметы линии от головы к хвосту с глобальной позицией; клетки идут по x. */
  function snapshot(s: SimState, cells: number): { item: string; g: number }[] {
    const out: { item: string; g: number }[] = [];
    for (let i = cells - 1; i >= 0; i--) {
      for (const it of at(s, 1 + i, 5).belt ?? []) out.push({ item: it.item, g: i * BELT_CELL + it.pos });
    }
    return out;
  }

  /** Гоним поток по цепочке kinds в тупик; каждый тик проверяем инварианты. */
  function check(kinds: string[], ticks: number): void {
    const s = line(kinds);
    const speeds = kinds.map((k) => speedOf(k));
    let pushed = 0;
    let prev = new Map<string, number>();
    // Нарушения копим текстом и проверяем один раз: expect на каждый предмет каждого тика слишком медленный.
    const bad: string[] = [];
    for (let t = 0; t < ticks; t++) {
      if (pushToBelt(at(s, 1, 5), `i${pushed}`)) pushed++;
      tick(s, []);
      const snap = snapshot(s, kinds.length);
      // Без потерь и дублей.
      if (snap.length !== pushed) bad.push(`тик ${t}: на лентах ${snap.length} из ${pushed}`);
      // Без наложений: порядок сохранён (от головы номера растут), зазор соблюдается и на стыках.
      for (let k = 1; k < snap.length; k++) {
        if (Number(snap[k]!.item.slice(1)) <= Number(snap[k - 1]!.item.slice(1))) bad.push(`тик ${t}: нарушен порядок`);
        if (snap[k - 1]!.g - snap[k]!.g < BELT_GAP) bad.push(`тик ${t}: зазор ${snap[k - 1]!.g - snap[k]!.g}`);
      }
      // Без телепорта: за тик не дальше скорости ленты, на которой стоял предмет.
      const cur = new Map(snap.map((x) => [x.item, x.g]));
      for (const [item, g] of cur) {
        const before = prev.get(item);
        if (before === undefined) continue;
        const max = speeds[Math.min(Math.floor(before / BELT_CELL), kinds.length - 1)]!;
        if (g < before || g - before > max) bad.push(`тик ${t}: ${item} сдвинулся на ${g - before}`);
      }
      prev = cur;
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // Поток дошёл до тупика и встал в пробку; зазор в ней проверен тем же циклом.
    expect(pushed).toBeGreaterThan(20);
  }

  it('быстрая → обычная → быстрая, поток в тупик', () => {
    check(['fastBelt', 'fastBelt', 'fastBelt', 'belt', 'belt', 'belt', 'fastBelt', 'fastBelt', 'fastBelt', 'belt'], 700);
  });

  it('обычная → быстрая → обычная', () => {
    check(['belt', 'belt', 'fastBelt', 'fastBelt', 'belt', 'belt', 'fastBelt', 'belt'], 700);
  });

  it('быстрая лента сквозь тоннель в обычную и обратно', () => {
    check(['fastBelt', 'fastUndergroundBelt', 'fastUndergroundBelt', 'belt', 'undergroundBelt', 'undergroundBelt', 'fastBelt'], 600);
  });

  it('предмет на стыке быстрой и обычной не уходит дальше границы', () => {
    const s = line(['fastBelt', 'belt']);
    at(s, 1, 5).belt = [{ item: 'coal', pos: BELT_CELL - 4 }];
    tick(s, []);
    expect(at(s, 1, 5).belt).toEqual([]);
    expect(at(s, 2, 5).belt).toEqual([{ item: 'coal', pos: 12 }]);
  });
});

describe('пропускная способность', () => {
  /** Сколько предметов прошло середину ленты x = 3 за тики 100..ticks (поток уже установился); линия 18 клеток, до тика 260 голова не упирается в тупик. */
  function throughput(kind: string, ticks: number): number {
    const s = line(Array<string>(18).fill(kind));
    const speed = speedOf(kind);
    let passed = 0;
    for (let t = 0; t < ticks; t++) {
      pushToBelt(at(s, 1, 5), 'coal');
      tick(s, []);
      if (t < 100) continue;
      passed += (at(s, 3, 5).belt ?? []).filter((it) => it.pos >= BELT_CELL / 2 && it.pos < BELT_CELL / 2 + speed).length;
    }
    return passed;
  }

  it('быстрая лента пропускает вдвое больше обычной', () => {
    const slow = throughput('belt', 260);
    const fast = throughput('fastBelt', 260);
    expect(slow).toBeGreaterThanOrEqual(20);
    expect(fast).toBe(slow * 2);
  });

  it('быстрый подземный даёт ту же пропускную способность, что быстрая лента', () => {
    const tun = line(['fastBelt', 'fastBelt', 'fastUndergroundBelt', 'fastUndergroundBelt', 'fastBelt', 'fastBelt', 'fastBelt', 'fastBelt', 'fastBelt']);
    const flat = line(Array<string>(9).fill('fastBelt'));
    let a = 0;
    let b = 0;
    for (let t = 0; t < 600; t++) {
      pushToBelt(at(tun, 1, 5), 'coal');
      pushToBelt(at(flat, 1, 5), 'coal');
      tick(tun, []);
      tick(flat, []);
      a += (at(tun, 9, 5).belt ?? []).filter((it) => it.pos >= BELT_CELL - 16).length;
      b += (at(flat, 9, 5).belt ?? []).filter((it) => it.pos >= BELT_CELL - 16).length;
    }
    expect(a).toBe(b);
  });

  it('быстрый тоннель идёт со скоростью 16: путь в 6 клеток за 96 тиков', () => {
    const s = line(['fastUndergroundBelt', 'chest', 'chest', 'chest', 'fastUndergroundBelt', 'fastBelt']);
    pushToBelt(at(s, 1, 5), 'coal');
    let arrived = -1;
    for (let t = 1; t <= 200 && arrived < 0; t++) {
      tick(s, []);
      if ((at(s, 6, 5).belt ?? []).length > 0) arrived = t;
    }
    // 5 клеток тоннеля при 16 за тик: 80 тиков до выхода, плюс выход в соседнюю клетку.
    expect(arrived).toBeGreaterThanOrEqual(75);
    expect(arrived).toBeLessThanOrEqual(90);
  });
});

describe('быстрый манипулятор', () => {
  /** Сколько предметов манипулятор переложил из сундука в сундук за ticks тиков. */
  function moved(inserter: string, ticks: number): number {
    const s = stocked(createState(1, { width: 16, height: 16 }));
    tick(s, [build('chest', 2, 5), build(inserter, 3, 5), build('chest', 4, 5)]);
    at(s, 2, 5).slots = [{ item: 'coal', count: 1000 }];
    electrify(s);
    for (let t = 0; t < ticks; t++) tick(s, []);
    return at(s, 4, 5).slots?.[0]?.count ?? 0;
  }

  it('переносит вдвое чаще обычного', () => {
    const slow = moved('inserter', 600);
    const fast = moved('fastInserter', 600);
    expect(slow).toBeGreaterThanOrEqual(15);
    expect(fast).toBeGreaterThanOrEqual(slow * 2 - 1);
    expect(fast).toBeLessThanOrEqual(slow * 2 + 1);
  });
});
