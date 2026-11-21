---
id: TASK-20
title: Property-based тесты инвариантов sim на fast-check
status: Done
assignee: []
created_date: '2026-11-20T16:35:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels: []
milestone: m-1
dependencies: []
references:
  - sim
type: chore
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Детерминизм проверяется одним фиксированным сценарием. Нужны тесты на fast-check: случайные последовательности команд build/demolish и тиков на небольшой карте с залежами, проверка инвариантов после каждого шага. Особенно важно перед TASK-15 (переделка конвейеров на сегменты). Только тесты в packages/sim; если найден баг ядра — не чинить, завести задачу и пометить тест it.skip со ссылкой на неё.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 fast-check добавлен в devDependencies sim; генератор случайных последовательностей команд и тиков на карте с залежами
- [x] #2 Инвариант: клетки occupancy совпадают с отпечатками зданий, здания не пересекаются, после сноса клетки свободны
- [x] #3 Инвариант: одно зерно и одна последовательность дают один хеш (два прогона)
- [x] #4 Инвариант сохранения предметов: добыто из залежей = предметы в зданиях, на конвейерах и в инвентаре + израсходовано печами (с учётом выхода рецепта)
- [x] #5 Число прогонов ограничено так, что pnpm test остаётся быстрым (< 5 с на файл)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Тесты: packages/sim/src/invariants.test.ts, помощники packages/sim/src/propKit.ts. Найдено: TASK-22 (снос печи посреди цикла теряет ингредиенты); модель учитывает потерю в Ledger.lostInFlight.
<!-- SECTION:NOTES:END -->
