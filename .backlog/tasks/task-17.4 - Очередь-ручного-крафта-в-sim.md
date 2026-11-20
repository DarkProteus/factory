---
id: TASK-17.4
title: Очередь ручного крафта в sim
status: In Progress
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T18:49:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
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
- [ ] #1 Команда craft(recipe, count) списывает ингредиенты сразу и ставит рецепт в очередь; без ингредиентов или для рецепта печи команда игнорируется
- [ ] #2 Очередь выполняется по ticks рецепта, результат уходит в инвентарь; если не помещается, очередь ждёт
- [ ] #3 Команда cancelCraft(index) возвращает ингредиенты; при нехватке места отмена запрещена
- [ ] #4 Очередь входит в хеш и сохранение
<!-- AC:END -->
