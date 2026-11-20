---
id: TASK-27
title: Сборщик с выбранным рецептом
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies:
  - TASK-25
  - TASK-26
references:
  - sim
type: feature
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Энергия подключается отдельно (задача электросети), до неё сборщик работает на полной скорости.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Команда setRecipe(building, recipe) задаёт рецепт сборщика из рецептов madeIn: assembler; без рецепта сборщик стоит
- [ ] #2 Манипулятор кладёт в сборщик только ингредиенты его рецепта и не больше буфера входа
- [ ] #3 При смене рецепта вход, выход и ингредиенты идущего цикла уходят в инвентарь; если не помещается, смена запрещена
- [ ] #4 Цепочка провод → схема на двух сборщиках с манипуляторами даёт расчётное число схем
<!-- AC:END -->
