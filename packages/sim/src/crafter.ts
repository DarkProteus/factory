import { recipes as contentRecipes, type BuildingDef, type RecipeDef } from '@factory/content';
import type { ItemStack, PlacedBuilding } from './buildings';
import { fuelAccept, fuelCanAccept, isFuel } from './fuel';
import { energyTick } from './power';

type Recipes = Readonly<Record<string, RecipeDef>>;
/** Открытые рецепты (state.research.unlocked); undefined — открыто всё. */
type Unlocked = readonly string[] | undefined;

/** Первый открытый рецепт (в порядке content.recipes) этого здания с предметом во входе. */
function pickRecipe(type: string, item: string, recipes: Recipes, unlocked: Unlocked): string | undefined {
  return Object.keys(recipes).find(
    (id) => recipes[id]!.madeIn === type && item in recipes[id]!.in && (!unlocked || unlocked.includes(id)),
  );
}

/**
 * Рецепт, по которому здание приняло бы предмет прямо сейчас, или undefined.
 * Рецепт по входу меняется, только когда вход пуст и цикл не идёт (выход может быть не забран).
 */
function recipeFor(b: PlacedBuilding, item: string, recipes: Recipes, unlocked: Unlocked): string | undefined {
  if (b.recipe !== undefined && item in (recipes[b.recipe]?.in ?? {})) return b.recipe;
  const idle = b.recipe === undefined || (b.progress === 0 && (b.input ?? []).every((s) => s.count === 0));
  return idle ? pickRecipe(b.type, item, recipes, unlocked) : undefined;
}

function stackFor(b: PlacedBuilding, item: string): ItemStack | undefined {
  return b.input?.find((s) => s.item === item);
}

/** Принимает ли крафтер предмет: он есть во входе рецепта и вход не полон. Печь выбирает рецепт среди unlocked. */
export function crafterCanAccept(
  b: PlacedBuilding,
  def: BuildingDef,
  item: string,
  recipes: Recipes = contentRecipes,
  unlocked?: readonly string[],
): boolean {
  // Топливо идёт в ячейку топлива, а не во вход.
  if (isFuel(item) && def.fuelSlot) return fuelCanAccept(b, def, item);
  // Сборщик (recipeMode 'chosen') принимает только ингредиенты выбранного рецепта; без рецепта стоит.
  const id = def.recipeMode === 'chosen' ? b.recipe : recipeFor(b, item, recipes, unlocked);
  if (id === undefined || !(item in (recipes[id]?.in ?? {}))) return false;
  const cap = recipes[id]!.in[item]! * (def.inputBuffer ?? 0);
  return (stackFor(b, item)?.count ?? 0) < cap;
}

/** Кладёт предмет на вход; перед этим нужно проверить crafterCanAccept. */
export function crafterAccept(
  b: PlacedBuilding,
  def: BuildingDef,
  item: string,
  recipes: Recipes = contentRecipes,
  unlocked?: readonly string[],
): void {
  if (isFuel(item) && def.fuelSlot) return fuelAccept(b, item);
  const id = def.recipeMode === 'chosen' ? b.recipe! : recipeFor(b, item, recipes, unlocked)!;
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
 * Энергия (energyTick, power.ts) тратится за каждый тик цикла: топливо — fuel.ts, сеть — со скоростью × удовлетворённость.
 */
export function runCrafter(
  b: PlacedBuilding,
  def: BuildingDef,
  satisfaction: number | undefined,
  recipes: Recipes = contentRecipes,
): void {
  const recipe = b.recipe === undefined ? undefined : recipes[b.recipe];
  if (!recipe) return;
  if (b.progress === 0) {
    if (!canStart(b, recipe, def.buffer ?? 0)) {
      // Выбранный рецепт сборщика не сбрасывается: его меняет только игрок.
      if (def.recipeMode !== 'chosen' && !b.output && b.input!.every((s) => s.count === 0)) {
        delete b.recipe;
        delete b.input;
      }
      return;
    }
    // Без энергии (топлива или сети) цикл не начинается: руда остаётся во входе.
    if (!energyTick(b, def, satisfaction)) return;
    for (const [item, n] of Object.entries(recipe.in)) stackFor(b, item)!.count -= n;
    b.progress = 1;
  } else {
    // Идущий цикл без энергии стоит на месте и продолжится, когда топливо появится.
    if (!energyTick(b, def, satisfaction)) return;
    b.progress += 1;
  }
  if (b.progress < recipe.ticks) return;
  b.progress = 0;
  const [out, n] = Object.entries(recipe.out)[0]!;
  if (b.output) b.output.count += n;
  else b.output = { item: out, count: n };
}
