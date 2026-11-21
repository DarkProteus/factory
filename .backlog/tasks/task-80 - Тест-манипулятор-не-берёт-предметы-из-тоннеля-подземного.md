---
id: TASK-80
title: 'Тест: манипулятор не берёт предметы из тоннеля подземного'
status: Done
assignee: []
created_date: '2026-11-21T17:42:00Z'
updated_date: '2026-11-21T18:24:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/underground.test.ts
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
- [x] #1 Тест с парой подземных: предмет в тоннеле манипулятор не берёт, на поверхности входа — берёт
- [x] #2 pnpm test зелёный
<!-- AC:END -->
