import { recipes as contentRecipes, type BuildingDef, type RecipeDef } from '@factory/content';
import type { ItemStack, PlacedBuilding } from './buildings';
import { burnTick, fuelAccept, fuelCanAccept, isFuel } from './fuel';

type Recipes = Readonly<Record<string, RecipeDef>>;

/** Первый рецепт (в порядке content.recipes) этого здания с предметом во входе. */
function pickRecipe(type: string, item: string, recipes: Recipes): string | undefined {
  return Object.keys(recipes).find((id) => recipes[id]!.madeIn === type && item in recipes[id]!.in);
}

/**
 * Рецепт, по которому здание приняло бы предмет прямо сейчас, или undefined.
 * Рецепт по входу меняется, только когда вход пуст и цикл не идёт (выход может быть не забран).
 */
function recipeFor(b: PlacedBuilding, item: string, recipes: Recipes): string | undefined {
  if (b.recipe !== undefined && item in (recipes[b.recipe]?.in ?? {})) return b.recipe;
  const idle = b.recipe === undefined || (b.progress === 0 && (b.input ?? []).every((s) => s.count === 0));
  return idle ? pickRecipe(b.type, item, recipes) : undefined;
}

function stackFor(b: PlacedBuilding, item: string): ItemStack | undefined {
  return b.input?.find((s) => s.item === item);
}

/** Принимает ли крафтер предмет: он есть во входе рецепта и вход не полон. */
export function crafterCanAccept(
  b: PlacedBuilding,
  def: BuildingDef,
  item: string,
  recipes: Recipes = contentRecipes,
): boolean {
  // Топливо идёт в ячейку топлива, а не во вход.
  if (isFuel(item) && def.fuelSlot) return fuelCanAccept(b, def, item);
  // Сборщик (recipeMode 'chosen') ждёт выбора рецепта игроком, пока стоит.
  if (def.recipeMode === 'chosen') return false;
  const id = recipeFor(b, item, recipes);
  if (id === undefined) return false;
  const cap = recipes[id]!.in[item]! * (def.inputBuffer ?? 0);
  return (stackFor(b, item)?.count ?? 0) < cap;
}

/** Кладёт предмет на вход; перед этим нужно проверить crafterCanAccept. */
export function crafterAccept(b: PlacedBuilding, def: BuildingDef, item: string, recipes: Recipes = contentRecipes): void {
  if (isFuel(item) && def.fuelSlot) return fuelAccept(b, item);
  const id = recipeFor(b, item, recipes)!;
  if (b.recipe !== id) {
    b.recipe = id;
    b.input = Object.keys(recipes[id]!.in).map((name) => ({ item: name, count: 0 }));
  }
  stackFor(b, item)!.count += 1;
}

function canStart(b: PlacedBuilding, recipe: RecipeDef, buffer: number): boolean {
  if (!Object.entries(recipe.in).every(([item, n]) => (stackFor(b, item)?.count ?? 0) >= n)) return false;
  const [out, n] = Object.entries(recipe.out)[0]!;
  if (!b.output) return n <= buffer;
  return b.output.item === out && b.output.count + n <= buffer;
}

/**
 * Поведение crafter: на старте цикла списывает ингредиенты, через ticks тиков
 * добавляет результат в выход. Выход полон — новый цикл не стартует.
 * Здание с energy 'fuel' тратит энергию за каждый тик цикла (fuel.ts), без неё стоит.
 */
export function runCrafter(b: PlacedBuilding, def: BuildingDef, recipes: Recipes = contentRecipes): void {
  const recipe = b.recipe === undefined ? undefined : recipes[b.recipe];
  if (!recipe) return;
  if (b.progress === 0) {
    if (!canStart(b, recipe, def.buffer ?? 0)) {
      if (!b.output && b.input!.every((s) => s.count === 0)) {
        delete b.recipe;
        delete b.input;
      }
      return;
    }
    // Печь без топлива цикл не начинает: руда остаётся во входе.
    if (!burnTick(b, def)) return;
    for (const [item, n] of Object.entries(recipe.in)) stackFor(b, item)!.count -= n;
    b.progress = 1;
  } else {
    // Идущий цикл без топлива стоит на месте и продолжится, когда топливо появится.
    if (!burnTick(b, def)) return;
    b.progress += 1;
  }
  if (b.progress < recipe.ticks) return;
  b.progress = 0;
  const [out, n] = Object.entries(recipe.out)[0]!;
  if (b.output) b.output.count += n;
  else b.output = { item: out, count: n };
}
