// Таблицы ожиданий «здание × здание» для pairs.test.ts (TASK-71). Источник правил — docs/design.md:
// «Разделитель», «Сочетания зданий» (M2) и «Лаборатория» (M3). Ключ — behavior; когда у одного поведения
// ответ зависит от здания, строку уточняет byId (id из content). Нет строки — pairs.test.ts падает.
import type { Behavior } from '@factory/content';

/** Поведения без здания в content (заготовки): пары для них не строятся; появится здание — тест потребует строки. */
export const NO_BUILDING_YET: readonly Behavior[] = ['turret'];

/** Поведения, у которых в content есть (или будет) здание: заготовки исключены, чтобы Record требовал строку на каждое. */
export type PlayableBehavior = Exclude<Behavior, 'turret'>;

/** Ожидание «можно / нельзя» по поведению здания, с уточнением по id. */
export type Rule = Record<PlayableBehavior, boolean> & { byId?: Record<string, boolean> };

/** Найденное ожидание или undefined, если для здания (id, behavior) строки нет. */
export function lookup(rule: Partial<Rule> | undefined, id: string, behavior: string): boolean | undefined {
  if (!rule) return undefined;
  const byId = rule.byId?.[id];
  if (byId !== undefined) return byId;
  return Object.hasOwn(rule, behavior) ? (rule as Record<string, boolean>)[behavior] : undefined;
}

/**
 * Манипулятор берёт у здания-источника (behavior), если в нём лежит подходящий предмет.
 * Берёт: выход бура и крафтера (не вход и не топливо), любой предмет с ленты, с поверхности подземного
 * (не из тоннеля), буфер разделителя (мимо круга выходов и фильтра, TASK-69), ячейки лаборатории (TASK-78) и контейнера.
 * Не берёт: топливо генератора, руку манипулятора, столб.
 */
export const MANIP_TAKES: Rule = {
  miner: true,
  belt: true,
  underground: true,
  splitter: true,
  filterSplitter: true,
  crafter: true,
  lab: true,
  container: true,
  generator: false,
  inserter: false,
  pole: false,
};

/**
 * Манипулятор кладёт в здание-цель (behavior) подходящий ему предмет: ленту, подземный, пустой буфер разделителя,
 * вход/топливо крафтера (сборщику — ингредиент выбранного рецепта), пакет активной технологии в лабораторию,
 * топливо в генератор, любой предмет в контейнер. Бур, манипулятор и столб не принимают ничего.
 */
export const MANIP_PUTS: Rule = {
  miner: false,
  belt: true,
  underground: true,
  splitter: true,
  filterSplitter: true,
  crafter: true,
  lab: true,
  container: true,
  generator: true,
  inserter: false,
  pole: false,
};

/** Что принимает выход ленты: ленту, разделитель сзади, вход подземного; в здания лента не кладёт (design.md, «Сочетания зданий»). */
const BELT_FEEDS: Rule = {
  miner: false,
  belt: true,
  underground: true,
  splitter: true,
  filterSplitter: true,
  crafter: false,
  lab: false,
  container: false,
  generator: false,
  inserter: false,
  pole: false,
};

/**
 * Что здание отдаёт само, без манипулятора: giver (behavior) → цель (behavior) → отдаёт ли.
 * Бур выкладывает руду во всё, что её примет: ленту, разделитель, подземный, печь, сундук, генератор (уголь);
 * лабораторию — нет: emit бура не знает активной технологии, пакетов у бура не бывает.
 * 'none' — здание само никому не отдаёт: крафтер, лаборатория, генератор, контейнер, столб — только через манипулятор;
 * манипулятор — это MANIP_*; вход подземного отдаёт только своему выходу (underground.test.ts).
 */
export const GIVES: Record<PlayableBehavior, Rule | 'none'> = {
  belt: BELT_FEEDS,
  splitter: BELT_FEEDS,
  filterSplitter: BELT_FEEDS,
  miner: { ...BELT_FEEDS, crafter: true, container: true, generator: true },
  underground: 'none',
  crafter: 'none',
  lab: 'none',
  generator: 'none',
  container: 'none',
  inserter: 'none',
  pole: 'none',
};
