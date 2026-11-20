---
id: TASK-17.1
title: Постройка тратит предмет-здание, снос возвращает его
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
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Пункты #2 и #3 TASK-17.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Команда build списывает 1 предмет-здание из инвентаря; без него команда игнорируется
- [ ] #2 Снос возвращает предмет-здание вместе с содержимым; проверка места делается сразу для всего, при нехватке снос запрещён
- [ ] #3 Хеш и property-тесты инвариантов учитывают предметы-здания: число предметов в мире и инвентаре сохраняется при build/снос
<!-- AC:END -->
