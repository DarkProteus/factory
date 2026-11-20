---
id: TASK-17.4
title: Очередь ручного крафта в sim
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T18:56:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
modified_files:
  - packages/sim/src/craftQueue.ts
  - packages/sim/src/craftQueue.test.ts
  - packages/sim/src/inventory.ts
  - packages/sim/src/state.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/tick.ts
  - packages/sim/src/index.ts
  - packages/save/src/validate.ts
  - packages/save/src/index.test.ts
parent_task_id: TASK-17
type: feature
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Часть пункта #5 TASK-17. Руками крафтятся рецепты madeIn: assembler.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Команда craft(recipe, count) списывает ингредиенты сразу и ставит рецепт в очередь; без ингредиентов или для рецепта печи команда игнорируется
- [x] #2 Очередь выполняется по ticks рецепта, результат уходит в инвентарь; если не помещается, очередь ждёт
- [x] #3 Команда cancelCraft(index) возвращает ингредиенты; при нехватке места отмена запрещена
- [x] #4 Очередь входит в хеш и сохранение
<!-- AC:END -->
