---
id: TASK-17.2
title: 'Новая партия: стартовая карта и стартовый набор из content'
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - sim
  - ui
  - save
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
