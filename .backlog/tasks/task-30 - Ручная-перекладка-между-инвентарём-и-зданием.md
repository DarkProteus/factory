---
id: TASK-30
title: Ручная перекладка между инвентарём и зданием
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T22:25:00Z'
labels:
  - m2
dependencies:
  - TASK-26
  - TASK-27
references:
  - sim
modified_files:
  - packages/sim/src/manual.ts
  - packages/sim/src/manual.test.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/index.ts
  - .groma/systems/factory/containers/browser-game/components/sim.md
type: feature
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 takeFromBuilding(building, slot) переносит ячейку здания (выход, вход, топливо, ячейка сундука) в инвентарь целиком или сколько помещается
- [x] #2 putIntoBuilding(building, item, count) кладёт туда же, куда положил бы манипулятор; лишнее остаётся в инвентаре
- [x] #3 Число предметов в мире и инвентаре сохраняется
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: команды в manual.ts, адрес ячейки BuildingSlot (output | fuel | input[index] | slot[index]). putIntoBuilding допускает и конвейер (через canAccept) — решить в TASK-34.
<!-- SECTION:NOTES:END -->
