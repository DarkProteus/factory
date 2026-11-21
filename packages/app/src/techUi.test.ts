import type { TechnologyDef } from '@factory/content';
import { createState, type SimEvent } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import {
  CARD_H,
  CARD_W,
  COL_GAP,
  noticeAlpha,
  pickNotice,
  researchBar,
  researchDoneTechs,
  missingRequires,
  techDepths,
  techIcon,
  techLayers,
  techLayout,
  techStatus,
  techUnlocks,
  tipPosition,
} from './techUi';

const tech = (requires: string[] = [], unlocks: string[] = []): TechnologyDef => ({
  name: 'Т',
  unit: { sciencePackRed: 1 },
  units: 10,
  unitTicks: 600,
  requires,
  unlocks,
});
// a и e без требований; b <- a; c <- a, b (глубина 2); d <- e.
const techs = { a: tech(), e: tech(), b: tech(['a']), c: tech(['a', 'b']), d: tech(['e']) };

const fresh = () => createState(1);

// rule: research-window
describe('слои дерева', () => {
  it('глубина — самая длинная цепочка requires', () => {
    expect(techDepths(techs)).toEqual({ a: 0, e: 0, b: 1, c: 2, d: 1 });
  });

  it('столбец = глубина, внутри столбца порядок как в content', () => {
    expect(techLayers(techs)).toEqual([['a', 'e'], ['b', 'd'], ['c']]);
  });

  it('реальные технологии: подземные конвейеры правее логистики, быстрые конвейеры — на третьем слое', () => {
    const d = techDepths();
    expect(d.logistics).toBe(0);
    expect(d.undergroundBelts).toBe(1);
    expect(d.fastBelt).toBe(2);
  });
});

describe('раскладка', () => {
  it('карточки стоят по сетке: столбец через 168 + 48, ряд через 64 + 12', () => {
    const { cards, width, height } = techLayout(techs);
    const at = (id: string) => cards.find((c) => c.id === id)!;
    expect(at('a')).toMatchObject({ x: 0, y: 0 });
    expect(at('e')).toMatchObject({ x: 0, y: CARD_H + 12 });
    expect(at('c')).toMatchObject({ x: 2 * (CARD_W + COL_GAP), y: 0 });
    expect(width).toBe(3 * CARD_W + 2 * COL_GAP);
    expect(height).toBe(2 * CARD_H + 12);
  });

  it('связь на соседний слой идёт через промежуток между столбцами', () => {
    const link = techLayout(techs).links.find((l) => l.from === 'a' && l.to === 'b')!;
    expect(link.path).toBe(`M${CARD_W} 32 H${CARD_W + 24} V32 H${CARD_W + 24} V32 H${CARD_W + COL_GAP}`);
  });

  it('связь через слой идёт по щели над целевой карточкой, не по карточкам', () => {
    const link = techLayout(techs).links.find((l) => l.from === 'a' && l.to === 'c')!;
    expect(link.path).toContain('V-6');
  });

  it('связей столько, сколько requires', () => {
    expect(techLayout(techs).links).toHaveLength(4);
  });
});

describe('состояния карточек', () => {
  it('закрыта, пока не изучены требования; доступна без требований', () => {
    const s = fresh();
    expect(techStatus(s, 'a', techs)).toBe('available');
    expect(techStatus(s, 'b', techs)).toBe('locked');
    expect(missingRequires(s, 'c', techs)).toEqual(['a', 'b']);
  });

  it('активна и изучена; после изучения требования зависимая становится доступной', () => {
    const s = fresh();
    s.research.active = 'a' as never;
    expect(techStatus(s, 'a', techs)).toBe('active');
    s.research.active = null;
    s.research.done = ['a'] as never;
    expect(techStatus(s, 'a', techs)).toBe('done');
    expect(techStatus(s, 'b', techs)).toBe('available');
    expect(missingRequires(s, 'c', techs)).toEqual(['b']);
  });
});

describe('иконка и подсказка', () => {
  it('иконка — продукт первого рецепта из unlocks, подсказка — продукты всех', () => {
    expect(techIcon('fastBelt')).toBe('fastBelt');
    expect(techUnlocks('fastBelt')).toEqual(['fastBelt', 'fastUndergroundBelt']);
    expect(techIcon('a', techs)).toBeNull();
  });
});

describe('полоска исследования', () => {
  it('без активной — «выберите»', () => {
    expect(researchBar(fresh(), techs)).toEqual({ kind: 'idle' });
  });

  it('активная: единицы и доля текущей единицы', () => {
    const s = fresh();
    s.research.active = 'a' as never;
    s.research.progress = { a: { units: 3, ticks: 300 } } as never;
    expect(researchBar(s, techs)).toEqual({ kind: 'active', id: 'a', name: 'Т', units: 3, total: 10, fraction: 0.35 });
  });

  it('изучено всё — скрыта', () => {
    const s = fresh();
    s.research.done = Object.keys(techs) as never;
    expect(researchBar(s, techs)).toEqual({ kind: 'hidden' });
  });
});

describe('событие researchDone и уведомление', () => {
  const ev = (...ts: string[]): SimEvent[] => ts.map((t) => ({ type: 'researchDone', tech: t as never }));

  it('собирает изученные технологии из событий тика', () => {
    expect(researchDoneTechs(ev('logistics', 'steel'))).toEqual(['logistics', 'steel']);
    expect(researchDoneTechs([])).toEqual([]);
  });

  it('новое уведомление заменяет старое, без событий остаётся прежнее', () => {
    const first = pickNotice(null, ev('logistics'), 100);
    expect(first).toEqual({ tech: 'logistics', at: 100 });
    expect(pickNotice(first, [], 200)).toBe(first);
    expect(pickNotice(first, ev('steel'), 300)).toEqual({ tech: 'steel', at: 300 });
  });

  it('видно 4 с, последние 0,5 с исчезает', () => {
    expect(noticeAlpha(0)).toBe(1);
    expect(noticeAlpha(3500)).toBe(1);
    expect(noticeAlpha(3750)).toBeCloseTo(0.5);
    expect(noticeAlpha(4000)).toBeNull();
  });
});

describe('tipPosition', () => {
  const view = { w: 1000, h: 600 };
  const tip = { w: 260, h: 100 };

  it('по умолчанию справа снизу от курсора', () => {
    expect(tipPosition({ x: 100, y: 100 }, tip, view)).toEqual({ left: 116, top: 116 });
  });

  it('у правого края уходит влево от курсора', () => {
    const p = tipPosition({ x: 900, y: 100 }, tip, view);
    expect(p.left).toBe(900 - 16 - 260);
  });

  it('у нижнего края уходит вверх от курсора', () => {
    const p = tipPosition({ x: 100, y: 580 }, tip, view);
    expect(p.top).toBe(580 - 16 - 100);
  });

  it('в углу целиком на экране', () => {
    const p = tipPosition({ x: 995, y: 595 }, tip, view);
    expect(p.left + tip.w).toBeLessThanOrEqual(view.w);
    expect(p.top + tip.h).toBeLessThanOrEqual(view.h);
  });

  it('при любой позиции курсора остаётся в пределах экрана', () => {
    for (let x = 0; x <= view.w; x += 25) {
      for (let y = 0; y <= view.h; y += 25) {
        const p = tipPosition({ x, y }, tip, view);
        expect(p.left).toBeGreaterThanOrEqual(0);
        expect(p.top).toBeGreaterThanOrEqual(0);
        expect(p.left + tip.w).toBeLessThanOrEqual(view.w);
        expect(p.top + tip.h).toBeLessThanOrEqual(view.h);
      }
    }
  });

  it('подсказка больше экрана прижимается к левому верхнему углу', () => {
    expect(tipPosition({ x: 50, y: 50 }, { w: 2000, h: 900 }, view)).toEqual({ left: 0, top: 0 });
  });
});
