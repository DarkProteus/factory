---
id: TASK-30
title: Ручная перекладка между инвентарём и зданием
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies:
  - TASK-26
  - TASK-27
references:
  - sim
type: feature
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 takeFromBuilding(building, slot) переносит ячейку здания (выход, вход, топливо, ячейка сундука) в инвентарь целиком или сколько помещается
- [ ] #2 putIntoBuilding(building, item, count) кладёт туда же, куда положил бы манипулятор; лишнее остаётся в инвентаре
- [ ] #3 Число предметов в мире и инвентаре сохраняется
<!-- AC:END -->
