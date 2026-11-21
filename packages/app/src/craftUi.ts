// Логика окна инвентаря и очереди ручного крафта без DOM: что показывать и какие
// команды слать. Состояние sim только читается, менять его можно лишь командами.
import {
  INVENTORY_SLOTS,
  recipes as contentRecipes,
  type RecipeDef,
} from "@factory/content";
import type { Command, CraftJob, ItemStack } from "@factory/sim";

/** Тиков в секунде симуляции. */
const TICKS_PER_SECOND = 60;
/** Сколько штук крафтится по Shift+клику. */
export const SHIFT_CRAFT_COUNT = 5;

type Recipes = Readonly<Record<string, RecipeDef>>;

/**
 * Рецепты ручного крафта: всё, что делается в сборщике (плавка руками недоступна).
 * open — открыт ли рецепт исследованиями; по умолчанию открыто всё.
 */
export function manualRecipes(
  recipes: Recipes = contentRecipes,
  open: (recipe: string) => boolean = () => true,
): { id: string; def: RecipeDef }[] {
  return Object.entries(recipes)
    .filter(([id, def]) => def.madeIn === "assembler" && open(id))
    .map(([id, def]) => ({ id, def }));
}

/** Сколько предмета во всём инвентаре. */
export function countItem(
  inventory: readonly ItemStack[],
  item: string,
): number {
  return inventory.reduce(
    (sum, s) => (s.item === item ? sum + s.count : sum),
    0,
  );
}

/** Хватает ли ингредиентов на count изготовлений. */
export function canCraft(
  inventory: readonly ItemStack[],
  def: RecipeDef,
  count = 1,
): boolean {
  return Object.entries(def.in).every(
    ([item, n]) => countItem(inventory, item) >= n * count,
  );
}

/** Команда крафта: клик — 1 шт., Shift+клик — до SHIFT_CRAFT_COUNT, сколько хватит ингредиентов. */
export function craftCommand(
  inventory: readonly ItemStack[],
  recipe: string,
  shift: boolean,
  recipes: Recipes = contentRecipes,
): Command {
  const def = recipes[recipe]!;
  const most = Math.min(
    ...Object.entries(def.in).map(([item, n]) =>
      Math.floor(countItem(inventory, item) / n),
    ),
  );
  return {
    type: "craft",
    recipe,
    count: shift ? Math.max(1, Math.min(SHIFT_CRAFT_COUNT, most)) : 1,
  };
}

export const cancelCommand = (index: number): Command => ({
  type: "cancelCraft",
  index,
});

/** Время рецепта в секундах. */
export const recipeSeconds = (def: RecipeDef): number =>
  def.ticks / TICKS_PER_SECOND;

/** Ячейки инвентаря для сетки: ровно INVENTORY_SLOTS, пустые — null. */
export function inventoryCells(
  inventory: readonly ItemStack[],
): (ItemStack | null)[] {
  return Array.from(
    { length: INVENTORY_SLOTS },
    (_, i) => inventory[i] ?? null,
  );
}

/** Доля выполненной записи очереди, 0..1; неизвестный рецепт — 0. */
export function jobProgress(
  job: CraftJob,
  recipes: Recipes = contentRecipes,
): number {
  const ticks = recipes[job.recipe]?.ticks;
  return ticks ? Math.min(1, job.progress / ticks) : 0;
}

/** Состояние окна инвентаря после клавиши: E переключает, Esc закрывает. */
export function applyUiKey(open: boolean, code: string): boolean {
  if (code === "KeyE") return !open;
  if (code === "Escape") return false;
  return open;
}
