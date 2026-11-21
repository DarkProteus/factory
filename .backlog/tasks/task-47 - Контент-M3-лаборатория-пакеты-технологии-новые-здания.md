---
id: TASK-47
title: 'Контент M3: лаборатория, пакеты, технологии, новые здания'
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:13:00Z'
labels:
  - m3
dependencies: []
references:
  - content
modified_files:
  - packages/content/src/types.ts
  - packages/content/src/items.ts
  - packages/content/src/recipes.ts
  - packages/content/src/buildings.ts
  - packages/content/src/technologies.ts
  - packages/content/src/player.ts
  - packages/content/src/index.ts
  - packages/content/src/validateContent.testkit.ts
  - packages/content/src/content.test.ts
  - packages/content/src/m3.test.ts
  - .groma/systems/factory/containers/browser-game/components/content.md
priority: high
type: feature
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Данные по docs/design.md, «Веха M3: решения»: предметы sciencePackRed, sciencePackGreen, steelPlate и предметы-здания; рецепты; здания lab, undergroundBelt, fastUndergroundBelt, fastBelt, fastInserter, filterSplitter; таблица technologies. Решение по типам (основная сессия): TechnologyDef = { name, unit: Partial<Record<ItemKey, number>>, units, unitTicks, requires: TechKey[], unlocks: RecipeKey[] }. Здание открывается рецептом своего предмета, отдельного списка зданий нет. Новые behavior (lab, underground, filterSplitter) объявляются в типе, реализация — в отдельных задачах sim. У рецептов поле startUnlocked не заводить: стартовый набор открытого — список startRecipes в content (всё из M2, кроме splitter, плюс lab и sciencePackRed).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Все предметы, рецепты, здания и технологии из design.md M3 есть в content с числами из таблиц
- [x] #2 Валидатор ссылок проверяет technologies: unit, requires, unlocks ссылаются на существующие ключи, в requires нет циклов
- [x] #3 startRecipes в content: всё из M2, кроме splitter, плюс lab и sciencePackRed
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Числа, не заданные в design.md, выбраны по соседям: время рецептов зданий 60 тиков (lab 120, fastBelt и fastInserter 30), стопка предметов-зданий 50 (fastBelt 100), hp lab 250, остальным 50. Типы называются RecipeId и TechId (как ItemId); TechId — явный union, иначе цикл в типах.
<!-- SECTION:NOTES:END -->
