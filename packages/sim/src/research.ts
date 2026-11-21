import { startRecipes, technologies, type RecipeId, type TechId } from '@factory/content';

/** Прогресс одной технологии: изученные единицы и тики текущей единицы. */
export interface TechProgress {
  units: number;
  ticks: number;
}

/** Состояние исследований (входит в хеш и сохранение). */
export interface ResearchState {
  /** Активная технология; null — лаборатории стоят. */
  active: TechId | null;
  /** Прогресс технологий, которых уже касались; нет записи — прогресса нет. */
  progress: Partial<Record<TechId, TechProgress>>;
  /** Открытые рецепты, отсортированный массив (ради хеша и сохранения). */
  unlocked: RecipeId[];
  /** Изученные технологии в порядке изучения. */
  done: TechId[];
}

/** Событие для интерфейса; список живёт один тик (очищается в начале tick). */
export type SimEvent = { type: 'researchDone'; tech: TechId };

type Techs = Readonly<Record<string, (typeof technologies)[TechId]>>;

/** Исследования новой партии: открыты только startRecipes. */
export function createResearch(): ResearchState {
  return { active: null, progress: {}, unlocked: [...startRecipes].sort(), done: [] };
}

/** Открыт ли рецепт (ручной крафт, выбор рецепта сборщика, печь). Постройку из инвентаря это не касается. */
export function isUnlocked(state: { research: Pick<ResearchState, 'unlocked'> }, recipe: string): boolean {
  return (state.research.unlocked as readonly string[]).includes(recipe);
}

/** Можно ли выбрать технологию: она есть, не изучена и все requires изучены. */
export function canResearch(state: { research: ResearchState }, tech: string, techs: Techs = technologies): boolean {
  if (!Object.hasOwn(techs, tech)) return false;
  const { done } = state.research;
  return !done.includes(tech as TechId) && techs[tech]!.requires.every((r) => done.includes(r as TechId));
}

/**
 * Команда setResearch: делает технологию активной, если она доступна (см. canResearch).
 * Прогресс (единицы) всех технологий сохраняется; начатая единица прежней активной сбрасывается.
 */
export function setResearch(state: { research: ResearchState }, tech: string, techs: Techs = technologies): void {
  const r = state.research;
  if (!canResearch(state, tech, techs) || r.active === tech) return;
  const prev = r.active === null ? undefined : r.progress[r.active];
  if (prev) prev.ticks = 0;
  r.active = tech as TechId;
  r.progress[r.active] ??= { units: 0, ticks: 0 };
}

/**
 * Добавляет активной технологии ticks тиков прогресса (целое, уже с учётом удовлетворённости сети).
 * Набранная единица засчитывается, остаток переносится; изученная технология открывает unlocks.
 * Без активной технологии ничего не делает. Пакеты списывает лаборатория, не эта функция.
 */
export function addResearchProgress(
  state: { research: ResearchState; events: SimEvent[] },
  ticks: number,
  techs: Techs = technologies,
): void {
  const r = state.research;
  if (r.active === null || !Number.isFinite(ticks) || ticks <= 0) return;
  const tech = techs[r.active]!;
  const p = (r.progress[r.active] ??= { units: 0, ticks: 0 });
  p.ticks += ticks;
  while (p.ticks >= tech.unitTicks && p.units < tech.units) {
    p.ticks -= tech.unitTicks;
    p.units += 1;
  }
  if (p.units < tech.units) return;
  p.ticks = 0;
  r.done.push(r.active);
  const open = new Set<string>(r.unlocked);
  for (const id of tech.unlocks) open.add(id);
  r.unlocked = [...open].sort() as RecipeId[];
  state.events.push({ type: 'researchDone', tech: r.active });
  r.active = null;
}
