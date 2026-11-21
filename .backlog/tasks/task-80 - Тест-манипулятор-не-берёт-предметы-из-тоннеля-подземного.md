---
id: TASK-80
title: 'Тест: манипулятор не берёт предметы из тоннеля подземного'
status: To Do
assignee: []
created_date: '2026-11-21T17:42:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
priority: low
type: chore
ordinal: 86000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Из отчёта TASK-71: правило takeFrom для underground (берётся только pos <= BELT_CELL, не из тоннеля) не покрыто тестом — без партнёра предмет остаётся на поверхности. Нужен тест с настоящей парой вход–выход: манипулятор у входа не забирает предмет, ушедший в тоннель.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Тест с парой подземных: предмет в тоннеле манипулятор не берёт, на поверхности входа — берёт
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
