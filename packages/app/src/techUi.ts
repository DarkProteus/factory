// Логика окна исследований, полоски и уведомления без DOM: слои дерева, состояния
// карточек, раскладка связей, прогресс, сбор события researchDone. Состояние sim только читается.
import { recipes as contentRecipes, technologies as contentTechs, type RecipeDef, type TechId, type TechnologyDef } from '@factory/content';
import { canResearch, type SimEvent, type SimState } from '@factory/sim';

type Techs = Readonly<Record<string, TechnologyDef>>;
type Recipes = Readonly<Record<string, RecipeDef>>;
type ResearchOnly = Pick<SimState, 'research'>;

/** Размеры карточки и промежутки дерева, px (docs/style-ui.md, «Окно исследований»). */
export const CARD_W = 168;
export const CARD_H = 64;
export const COL_GAP = 48;
export const ROW_GAP = 12;

/** Глубина технологии: 0 без требований, иначе 1 + самая глубокая из требуемых (цепочка requires). */
export function techDepths(techs: Techs = contentTechs): Record<string, number> {
  const depth: Record<string, number> = {};
  const of = (id: string): number =>
    (depth[id] ??= techs[id]!.requires.length === 0 ? 0 : 1 + Math.max(...techs[id]!.requires.map(of)));
  for (const id of Object.keys(techs)) of(id);
  return depth;
}

/** Слои слева направо: столбец = глубина, внутри столбца порядок как в content. */
export function techLayers(techs: Techs = contentTechs): string[][] {
  const depth = techDepths(techs);
  const layers: string[][] = [];
  for (const id of Object.keys(techs)) (layers[depth[id]!] ??= []).push(id);
  return layers;
}

export type TechStatus = 'done' | 'active' | 'available' | 'locked';

/** Состояние карточки: изучена, активна, доступна (требования изучены) или закрыта. */
export function techStatus(state: ResearchOnly, id: string, techs: Techs = contentTechs): TechStatus {
  const r = state.research;
  if (r.done.includes(id as never)) return 'done';
  if (r.active === id) return 'active';
  return canResearch(state, id, techs as Parameters<typeof canResearch>[2]) ? 'available' : 'locked';
}

/** Неизученные требования технологии (для строки «Нужно: …»). */
export function missingRequires(state: ResearchOnly, id: string, techs: Techs = contentTechs): string[] {
  return techs[id]!.requires.filter((r) => !state.research.done.includes(r as never));
}

/** Изученные единицы технологии. */
export const techUnits = (state: ResearchOnly, id: string): number => state.research.progress[id as TechId]?.units ?? 0;

/** Предмет-иконка технологии: продукт первого рецепта из unlocks; null, если открывать нечего. */
export function techIcon(id: string, techs: Techs = contentTechs, recipes: Recipes = contentRecipes): string | null {
  const first = techs[id]?.unlocks[0];
  const def = first === undefined ? undefined : recipes[first];
  return def ? (Object.keys(def.out)[0] ?? null) : null;
}

/** Продукты всех рецептов из unlocks (подсказка «Открывает:»). */
export function techUnlocks(id: string, techs: Techs = contentTechs, recipes: Recipes = contentRecipes): string[] {
  return techs[id]!.unlocks.flatMap((r) => (recipes[r] ? [Object.keys(recipes[r]!.out)[0]!] : []));
}

/** Время одной единицы в секундах. */
export const unitSeconds = (tech: TechnologyDef): number => tech.unitTicks / 60;

export interface TechLink {
  from: string;
  to: string;
  /** Ломаная SVG под 90° от правого края требования к левому краю зависимой. */
  path: string;
}

export interface TechLayout {
  cards: { id: string; x: number; y: number }[];
  links: TechLink[];
  width: number;
  height: number;
}

/**
 * Координаты карточек и связей. Связь на соседний столбец идёт через промежуток между столбцами;
 * связь через столбцы идёт по щели между рядами над целевой карточкой, чтобы не пересекать карточки.
 */
export function techLayout(techs: Techs = contentTechs): TechLayout {
  const layers = techLayers(techs);
  const pos: Record<string, { x: number; y: number; layer: number }> = {};
  layers.forEach((ids, layer) =>
    ids.forEach((id, row) => (pos[id] = { x: layer * (CARD_W + COL_GAP), y: row * (CARD_H + ROW_GAP), layer })),
  );
  const links: TechLink[] = [];
  for (const [to, tech] of Object.entries(techs)) {
    const t = pos[to]!;
    for (const from of tech.requires) {
      const s = pos[from]!;
      const sy = s.y + CARD_H / 2;
      const ty = t.y + CARD_H / 2;
      const midY = t.layer - s.layer > 1 ? t.y - ROW_GAP / 2 : ty;
      const sx = s.x + CARD_W;
      const gapIn = t.x - COL_GAP / 2;
      links.push({ from, to, path: `M${sx} ${sy} H${sx + COL_GAP / 2} V${midY} H${gapIn} V${ty} H${t.x}` });
    }
  }
  const rows = Math.max(0, ...layers.map((l) => l.length));
  return {
    cards: Object.entries(pos).map(([id, p]) => ({ id, x: p.x, y: p.y })),
    links,
    width: layers.length * CARD_W + Math.max(0, layers.length - 1) * COL_GAP,
    height: rows * CARD_H + Math.max(0, rows - 1) * ROW_GAP,
  };
}

export type ResearchBar =
  | { kind: 'active'; id: string; name: string; units: number; total: number; fraction: number }
  | { kind: 'idle' }
  | { kind: 'hidden' };

/** Полоска вверху: активная технология с долей (единицы + доля текущей единицы), «выберите» или скрыта, когда изучено всё. */
export function researchBar(state: ResearchOnly, techs: Techs = contentTechs): ResearchBar {
  const { active, progress, done } = state.research;
  if (active === null) return Object.keys(techs).every((id) => done.includes(id as never)) ? { kind: 'hidden' } : { kind: 'idle' };
  const tech = techs[active]!;
  const p = progress[active] ?? { units: 0, ticks: 0 };
  const fraction = Math.min(1, (p.units + p.ticks / tech.unitTicks) / tech.units);
  return { kind: 'active', id: active, name: tech.name, units: p.units, total: tech.units, fraction };
}

/** Какие технологии изучены за последний тик по событиям sim. */
export const researchDoneTechs = (events: readonly SimEvent[]): string[] =>
  events.flatMap((e) => (e.type === 'researchDone' ? [e.tech as string] : []));

/** Уведомление «Изучено»: технология и момент показа (мс). */
export interface Notice {
  tech: string;
  at: number;
}

/** Видно 4 с, последние 0.5 с исчезает. */
export const NOTICE_MS = 4000;
export const NOTICE_FADE_MS = 500;

/** Новое уведомление заменяет старое; последнее событие тика побеждает. Без событий остаётся прежнее. */
export function pickNotice(prev: Notice | null, events: readonly SimEvent[], now: number): Notice | null {
  const done = researchDoneTechs(events);
  return done.length ? { tech: done[done.length - 1]!, at: now } : prev;
}

/** Прозрачность уведомления через elapsed мс после показа; null, когда оно уже ушло. */
export function noticeAlpha(elapsed: number): number | null {
  if (elapsed < 0 || elapsed >= NOTICE_MS) return null;
  const left = NOTICE_MS - elapsed;
  return left >= NOTICE_FADE_MS ? 1 : left / NOTICE_FADE_MS;
}
