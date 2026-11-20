---
id: TASK-27
title: Сборщик с выбранным рецептом
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:14:00Z'
labels:
  - m2
dependencies:
  - TASK-25
  - TASK-26
references:
  - sim
modified_files:
  - packages/save/src/index.test.ts
  - packages/save/src/validate.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/assembler.test.ts
  - packages/sim/src/assembler.ts
type: feature
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Энергия подключается отдельно (задача электросети), до неё сборщик работает на полной скорости.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Команда setRecipe(building, recipe) задаёт рецепт сборщика из рецептов madeIn: assembler; без рецепта сборщик стоит
- [x] #2 Манипулятор кладёт в сборщик только ингредиенты его рецепта и не больше буфера входа
- [x] #3 При смене рецепта вход, выход и ингредиенты идущего цикла уходят в инвентарь; если не помещается, смена запрещена
- [x] #4 Цепочка провод → схема на двух сборщиках с манипуляторами даёт расчётное число схем
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью основной сессии: setRecipe принимает только строку — сброс рецепта в «нет» не поддержан; если понадобится окну здания (TASK-34), расширить до recipe: string | null.
<!-- SECTION:NOTES:END -->
