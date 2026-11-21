---
id: TASK-64
title: Лаборатория копит пакеты до целой стопки
status: Done
assignee: []
created_date: '2026-11-21T12:59:00Z'
updated_date: '2026-11-21T13:16:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/lab.ts
  - packages/sim/src/lab.test.ts
  - packages/sim/src/transfer.ts
type: bug
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
labCanAccept принимает пакеты, пока в ячейке меньше стопки (200). Две лаборатории на манипуляторах из одного сундука: первая забирает всё, вторая голодает (найдено в TASK-56: steel 30945 тиков при идеале 15000). Решение: как у сборщика — лаборатория принимает пакеты, пока их меньше чем на 2 единицы технологии (запас для следующей).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Лаборатория не принимает пакет вида, если его в ячейке уже хватает на 2 единицы активной технологии
- [x] #2 Две лаборатории из одного сундука исследуют примерно поровну (тест)
- [x] #3 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
LAB_BUFFER_UNITS = 2. Лимит действует и на ручную перекладку (как inputBuffer у сборщика). Времена milestone3 не изменились (раскладка уже обходила баг).
<!-- SECTION:NOTES:END -->
