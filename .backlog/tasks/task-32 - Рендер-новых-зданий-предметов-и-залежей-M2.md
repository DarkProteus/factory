---
id: TASK-32
title: Рендер новых зданий, предметов и залежей M2
status: In Progress
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:08:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - render
modified_files:
  - docs/style.md
type: feature
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md (разделитель, сборщик, столб, генератор, новые предметы и залежи). Проверить скриншотом.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 style.md описывает новые здания, предметы и залежи
- [ ] #2 Все здания и предметы M2 рисуются по style.md; скриншот проверен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
style.md дописан основной сессией (раздел «Сущности M2», токены палитры M2). Осталась реализация в render по style.md и скриншот. style.md близок к 300 строкам — при TASK-33 разделить.
<!-- SECTION:NOTES:END -->
