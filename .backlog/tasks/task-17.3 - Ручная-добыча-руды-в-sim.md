---
id: TASK-17.3
title: Ручная добыча руды в sim
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
parent_task_id: TASK-17
type: feature
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Часть пункта #5 TASK-17.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Команды startMining(x, y) и stopMining; пока добыча идёт, каждые MINING_TICKS тиков 1 руда залежи уходит в инвентарь и запас залежи уменьшается
- [ ] #2 На пустой клетке, на исчерпанной залежи и при полном инвентаре добыча не даёт ничего и ничего не теряет
- [ ] #3 Состояние добычи входит в хеш и сохранение
<!-- AC:END -->
