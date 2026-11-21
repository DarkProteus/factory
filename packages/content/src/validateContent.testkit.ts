import type { BuildingDef, ItemDef, RecipeDef, TechnologyDef } from './index';

export interface ContentTables {
  items: Record<string, ItemDef>;
  recipes: Record<string, RecipeDef>;
  buildings: Record<string, BuildingDef>;
  technologies: Record<string, TechnologyDef>;
}

// Валидатор ссылок. Живёт только в тесте: в самом пакете content логики нет.
// Возвращает список человекочитаемых ошибок, пустой список значит «всё в порядке».
export function validateContent(tables: ContentTables): string[] {
  const errors: string[] = [];
  for (const [id, recipe] of Object.entries(tables.recipes)) {
    for (const side of ['in', 'out'] as const) {
      for (const itemId of Object.keys(recipe[side])) {
        if (!(itemId in tables.items)) {
          errors.push(`рецепт ${id}: предмет ${itemId} (${side}) не существует`);
        }
      }
    }
    if (!(recipe.madeIn in tables.buildings)) {
      errors.push(`рецепт ${id}: здание ${recipe.madeIn} (madeIn) не существует`);
    } else if (tables.buildings[recipe.madeIn]!.behavior === 'crafter' && Object.keys(recipe.out).length !== 1) {
      errors.push(`рецепт ${id}: крафтер ${recipe.madeIn} держит один выходной предмет`);
    } else if (tables.buildings[recipe.madeIn]!.recipeMode === 'byInput' && Object.keys(recipe.in).length !== 1) {
      errors.push(`рецепт ${id}: печь ${recipe.madeIn} выбирает рецепт по входу, вход должен быть один`);
    }
  }
  const assemblerOutputs = new Set(
    Object.values(tables.recipes)
      .filter((r) => r.madeIn === 'assembler')
      .flatMap((r) => Object.keys(r.out)),
  );
  for (const id of Object.keys(tables.buildings)) {
    if (!(id in tables.items)) errors.push(`здание ${id}: нет предмета-здания ${id}`);
    else if (!assemblerOutputs.has(id)) errors.push(`предмет-здание ${id}: нет рецепта madeIn assembler`);
  }
  for (const [id, building] of Object.entries(tables.buildings)) {
    if ((building.energy?.kind === 'fuel' || building.energy?.kind === 'generator') && !building.fuelSlot) {
      errors.push(`здание ${id}: питается топливом, но без fuelSlot`);
    }
    if (building.ammo !== undefined && !(building.ammo in tables.items)) {
      errors.push(`здание ${id}: предмет ${building.ammo} (ammo) не существует`);
    }
  }
  for (const [id, tech] of Object.entries(tables.technologies)) {
    for (const itemId of Object.keys(tech.unit)) {
      if (!(itemId in tables.items)) errors.push(`технология ${id}: предмет ${itemId} (unit) не существует`);
    }
    for (const req of tech.requires) {
      if (!(req in tables.technologies)) errors.push(`технология ${id}: требование ${req} (requires) не существует`);
    }
    for (const recipeId of tech.unlocks) {
      if (!(recipeId in tables.recipes)) errors.push(`технология ${id}: рецепт ${recipeId} (unlocks) не существует`);
    }
  }
  // Циклы в requires: обход в глубину, серый узел на стеке значит цикл.
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`технологии: цикл в requires: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const req of tables.technologies[id]?.requires ?? []) {
      if (req in tables.technologies) visit(req, [...path, id]);
    }
    state.set(id, 'done');
  };
  for (const id of Object.keys(tables.technologies)) visit(id, []);
  return errors;
}
