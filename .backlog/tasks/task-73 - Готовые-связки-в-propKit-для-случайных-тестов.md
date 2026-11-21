---
id: TASK-73
title: Готовые связки в propKit для случайных тестов
status: In Progress
assignee: []
created_date: '2026-11-21T17:17:00Z'
updated_date: '2026-11-21T18:39:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/propKit.ts
  - packages/sim/src/propBundles.ts
  - packages/sim/src/invariants.bundles.test.ts
type: chore
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Случайные тесты (invariants.test.ts) строят отдельные здания, работающие цепочки почти не возникают. Добавить в propKit связки: бур → печь → манипулятор → сундук; лента → разделитель → манипулятор → здание; сборщик с подачей и выдачей; генератор и столбы; лаборатория с пакетами; подземный конвейер. fast-check ставит связки в случайных местах и поворотах, подаёт в них предметы, затем случайно сносит, достраивает и крутит тики. Существующие свойства (наложение, снос, детерминизм, сохранение предметов) гонять и по таким мирам.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Генератор мира из связок в propKit, связки задаются данными
- [x] #2 Свойство сохранения предметов проходит через каждую связку (тест считает, что предметы в связке реально двигались)
- [x] #3 Детерминизм по хешу на мирах из связок
- [x] #4 pnpm test зелёный, рост времени тестов не больше 10 с
<!-- AC:END -->
