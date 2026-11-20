---
id: TASK-41
title: 'Проверка сейва: рецепт крафтера требует стопки входа'
status: Done
assignee: []
created_date: '2026-11-20T19:27:00Z'
updated_date: '2026-11-20T23:06:00Z'
labels: []
dependencies: []
references:
  - save
modified_files:
  - packages/save/src/validate.ts
  - packages/save/src/index.test.ts
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
validate.ts пропускает крафтер с recipe, у которого нет input или нет стопки для какого-то ингредиента. Такой сейв роняет тик: crafterAccept и runCrafter обращаются к stackFor(...)! и b.input!. Видели на старом сейве из dev-вкладки и во временных состояниях агента TASK-32.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Сейв, где у крафтера задан recipe, но input отсутствует или в нём нет стопки для ингредиента рецепта, отклоняется с понятным сообщением
- [x] #2 Сейв, где у крафтера есть input без recipe или со стопкой не из рецепта, тоже отклоняется
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: checkCrafterInput в validate.ts — пара recipe/input, стопки по ингредиентам, без дублей и лишних; порядок стопок не проверяется.
<!-- SECTION:NOTES:END -->
