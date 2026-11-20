---
id: TASK-35
title: Иконка предмета на ленте меньше
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies: []
references:
  - render
type: feature
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Плотный поток руды: иконка 12 px при шаге 8 px перекрывается. Решение пользователя 2026-11-20: уменьшить иконку на ленте до ~8 px. Основная сессия сначала правит style.md, затем implementer или сама (правка в несколько строк).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 style.md задаёт размер иконки предмета на ленте ~8 px
- [ ] #2 Плотный поток на ленте не перекрывается; скриншот проверен
<!-- AC:END -->
