---
id: TASK-47
title: 'Контент M3: лаборатория, пакеты, технологии, новые здания'
status: In Progress
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:03:00Z'
labels:
  - m3
dependencies: []
references:
  - content
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
- [ ] #1 Все предметы, рецепты, здания и технологии из design.md M3 есть в content с числами из таблиц
- [ ] #2 Валидатор ссылок проверяет technologies: unit, requires, unlocks ссылаются на существующие ключи, в requires нет циклов
- [ ] #3 startRecipes в content: всё из M2, кроме splitter, плюс lab и sciencePackRed
- [ ] #4 pnpm test зелёный
<!-- AC:END -->
