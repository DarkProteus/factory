import { INVENTORY_SLOTS, recipes as contentRecipes, type RecipeDef } from '@factory/content';
import type { ItemStack } from './buildings';
import { add, countOf, removeItems } from './inventory';

/** Запись очереди ручного крафта: одно изготовление рецепта. */
export interface CraftJob {
  /** id из content.recipes (madeIn: 'assembler'). */
  recipe: string;
  /** Прошедшие тики; выполняется только первая запись очереди. */
  progress: number;
}

type Recipes = Readonly<Record<string, RecipeDef>>;

interface CraftState {
  inventory: ItemStack[];
  craftQueue: CraftJob[];
}

/** Кладёт все предметы в слоты; при нехватке места возвращает false (слоты тогда не определены). */
function addAll(slots: ItemStack[], items: Readonly<Record<string, number>>): boolean {
  for (const [item, count] of Object.entries(items)) {
    for (let i = 0; i < count; i++) if (!add(slots, INVENTORY_SLOTS, item)) return false;
  }
  return true;
}

/**
 * Ставит в очередь count изготовлений рецепта и сразу списывает ингредиенты на все.
 * Не хватает ингредиентов, рецепт печи или неизвестный, count не натуральное — без изменений.
 */
export function enqueueCraft(state: CraftState, recipe: string, count: number, recipes: Recipes = contentRecipes): void {
  if (!Number.isInteger(count) || count <= 0 || !Object.hasOwn(recipes, recipe)) return;
  const def = recipes[recipe]!;
  if (def.madeIn !== 'assembler') return;
  const needs = Object.entries(def.in);
  if (needs.some(([item, n]) => countOf(state.inventory, item) < n * count)) return;
  for (const [item, n] of needs) removeItems(state.inventory, item, n * count);
  for (let i = 0; i < count; i++) state.craftQueue.push({ recipe, progress: 0 });
}

/**
 * Отменяет запись очереди и возвращает ингредиенты в инвентарь.
 * Неверный индекс или нехватка места — без изменений.
 */
export function cancelCraft(state: CraftState, index: number, recipes: Recipes = contentRecipes): void {
  const job = Number.isInteger(index) ? state.craftQueue[index] : undefined;
  const def = job && recipes[job.recipe];
  if (!job || !def) return;
  const trial = state.inventory.map((s) => ({ ...s }));
  if (!addAll(trial, def.in)) return;
  state.inventory = trial;
  state.craftQueue.splice(index, 1);
}

/** Шаг очереди: первая запись набирает прогресс; готовый результат уходит в инвентарь, если помещается. */
export function stepCraftQueue(state: CraftState, recipes: Recipes = contentRecipes): void {
  const job = state.craftQueue[0];
  if (!job) return;
  const def = recipes[job.recipe];
  if (!def) return;
  job.progress = Math.min(job.progress + 1, def.ticks);
  if (job.progress < def.ticks) return;
  const trial = state.inventory.map((s) => ({ ...s }));
  if (!addAll(trial, def.out)) return;
  state.inventory = trial;
  state.craftQueue.shift();
}
