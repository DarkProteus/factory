---
id: TASK-34
title: Окно здания
status: In Progress
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T22:38:00Z'
labels:
  - m2
dependencies:
  - TASK-30
  - TASK-27
references:
  - ui
type: feature
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Клик по зданию открывает окно: содержимое, статус, прогресс; у сундука — его ячейки
- [ ] #2 У сборщика выбор рецепта (setRecipe)
- [ ] #3 Клик по ячейке здания — takeFromBuilding; клик по предмету инвентаря при открытом окне — putIntoBuilding
- [ ] #4 Скриншот проверен
<!-- AC:END -->
