---
id: TASK-17.1
title: Постройка тратит предмет-здание, снос возвращает его
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T18:57:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
modified_files:
  - packages/sim/src/buildings.ts
  - packages/sim/src/propKit.ts
  - packages/sim/src/testKit.ts
  - packages/sim/src/buildcost.test.ts
  - packages/sim/src/demolish.test.ts
  - packages/sim/src/belt.test.ts
  - packages/sim/src/canplace.test.ts
  - packages/sim/src/crafter.test.ts
  - packages/sim/src/grid.test.ts
  - packages/sim/src/inserter.test.ts
  - packages/sim/src/miner.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/app/src/demo.ts
  - packages/app/src/input.test.ts
  - packages/render/src/overlay.test.ts
  - packages/render/src/scene.test.ts
  - packages/save/src/index.test.ts
parent_task_id: TASK-17
type: feature
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Пункты #2 и #3 TASK-17.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Команда build списывает 1 предмет-здание из инвентаря; без него команда игнорируется
- [x] #2 Снос возвращает предмет-здание вместе с содержимым; проверка места делается сразу для всего, при нехватке снос запрещён
- [x] #3 Хеш и property-тесты инвариантов учитывают предметы-здания: число предметов в мире и инвентаре сохраняется при build/снос
<!-- AC:END -->
