---
id: TASK-17.2
title: 'Новая партия: стартовая карта и стартовый набор из content'
status: In Progress
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:11:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
  - ui
  - save
modified_files:
  - packages/sim/src/start.ts
  - packages/sim/src/start.test.ts
  - packages/sim/src/state.ts
  - packages/sim/src/grid.test.ts
  - packages/save/src/index.ts
  - packages/save/src/index.test.ts
  - packages/app/src/game.ts
  - packages/app/src/demo.ts
  - packages/app/src/deposits.test.ts
  - packages/app/src/persist.test.ts
  - packages/app/src/input.test.ts
parent_task_id: TASK-17
type: feature
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Пункт #4 TASK-17. Карта больше не захардкожена в app/src/demo.ts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createState по умолчанию строит карту из startMap и кладёт START_KIT в инвентарь
- [ ] #2 app берёт карту из content; demo.ts без собственного списка залежей
- [ ] #3 Версия формата сохранения поднята; сейв старой версии не загружается, партия начинается заново с уведомлением
<!-- AC:END -->
