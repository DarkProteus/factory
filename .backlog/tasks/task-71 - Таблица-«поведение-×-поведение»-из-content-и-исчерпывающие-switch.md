---
id: TASK-71
title: Таблица «поведение × поведение» из content и исчерпывающие switch
status: Done
assignee: []
created_date: '2026-11-21T17:17:00Z'
updated_date: '2026-11-21T17:42:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-70
  - TASK-77
  - TASK-78
references:
  - sim
  - content
modified_files:
  - packages/sim/src/pairs.test.ts
  - packages/sim/src/pairsTable.testkit.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/behaviors.ts
  - packages/render/src/draw/buildings.ts
  - docs/design.md
priority: high
type: chore
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Закрепить итог аудита TASK-70 тестом. Тест сам перебирает все пары зданий из content (источник × цель) и для каждой сверяет реальное поведение манипулятора (takeFrom/canAccept) и ленты с таблицей ожиданий «можно / нельзя». Пара без строки в таблице — падение теста: новое здание нельзя добавить, не решив, как оно сочетается с остальными. Плюс: в switch по behavior в sim включить проверку never там, где TASK-70 сочтёт это оправданным.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Тест строит пары из content, а не из списка в коде теста
- [x] #2 Новое здание без строки в таблице роняет тест (проверено временным зданием в тесте)
- [x] #3 Таблица совпадает с design.md; расхождения — отдельные задачи
- [x] #4 switch по behavior, отмеченные в TASK-70, исчерпывающие через never
- [x] #5 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: расхождения с design.md (устаревшие «Фильтра нет», фильтрующий разделитель в бэклоге, бур → лаборатория) исправлены в design.md основной сессией. Непокрытый случай тоннеля — TASK-80.
<!-- SECTION:NOTES:END -->
