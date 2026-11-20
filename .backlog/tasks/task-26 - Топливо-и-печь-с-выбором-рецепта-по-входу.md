---
id: TASK-26
title: Топливо и печь с выбором рецепта по входу
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T18:59:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
modified_files:
  - packages/sim/src/fuel.ts
  - packages/sim/src/fuel.test.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/crafter.test.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/miner.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/save/src/validate.ts
  - packages/save/src/index.test.ts
type: feature
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 У печи ячейка топлива на 1 стопку; манипулятор кладёт туда предметы с fuel, прочее — во вход; из печи берёт только выход
- [x] #2 Печь выбирает рецепт по пришедшей руде; другой ингредиент принимается только при пустом входе и без идущего цикла
- [x] #3 Печь тратит топливо по energy.kw за тик цикла; без топлива цикл стоит и продолжается, когда топливо появится
- [x] #4 100 железной и 100 медной руды с углём дают 100+100 пластин; угля уходит по расчёту из fuel и kw
- [x] #5 Снос возвращает и ячейку топлива; хеш и сохранение её учитывают
<!-- AC:END -->
