import { buildings as contentBuildings, INVENTORY_SLOTS, recipes as contentRecipes } from '@factory/content';
import { addAll, contents, type BuildingDefs } from './buildings';
import type { SimState } from './state';

/**
 * Задаёт рецепт сборщика (здание с recipeMode 'chosen'). Рецепт должен делаться в этом здании (madeIn).
 * При смене всё содержимое (вход, выход, ингредиенты идущего цикла) уходит в инвентарь;
 * если не помещается, смена не выполняется. Неверную команду и тот же рецепт молча игнорирует.
 */
export function setRecipe(
  state: SimState,
  buildingId: number,
  recipe: string,
  defs: BuildingDefs = contentBuildings,
  slotCount: number = INVENTORY_SLOTS,
): void {
  const b = Object.hasOwn(state.buildings, buildingId) ? state.buildings[buildingId] : undefined;
  const def = b && defs[b.type];
  if (!b || !def || def.behavior !== 'crafter' || def.recipeMode !== 'chosen') return;
  if (!Object.hasOwn(contentRecipes, recipe)) return;
  const recipeDef = contentRecipes[recipe as keyof typeof contentRecipes];
  if (recipeDef.madeIn !== b.type || b.recipe === recipe) return;
  const trial = state.inventory.map((s) => ({ ...s }));
  if (!addAll(trial, slotCount, contents(b))) return;
  state.inventory = trial;
  b.recipe = recipe;
  b.input = Object.keys(recipeDef.in).map((item) => ({ item, count: 0 }));
  b.output = null;
  b.progress = 0;
}
