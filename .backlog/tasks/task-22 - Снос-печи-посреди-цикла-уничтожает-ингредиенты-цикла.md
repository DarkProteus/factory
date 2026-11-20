---
id: TASK-22
title: Снос печи посреди цикла уничтожает ингредиенты цикла
status: Done
assignee: []
created_date: '2026-11-20T16:39:00Z'
updated_date: '2026-11-20T16:43:00Z'
labels: []
dependencies: []
references:
  - sim
type: bug
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Найдено property-тестами TASK-20. Печь списывает ингредиенты на старте цикла (crafter.ts, progress>0), а demolishAt возвращает в инвентарь только belt/output/input/slots. Если снести печь посреди цикла, ингредиенты цикла (например 1 железная руда) пропадают без следа. Контрпример: build drill(0,0), furnace(2,0), ждать до progress>0, demolish(2,0). Нужно решить: возвращать ингредиенты цикла при сносе (и тогда учесть при проверке места в инвентаре) или принять потерю как правило. Тест invariants.test.ts сейчас моделирует потерю в журнале (Ledger.lostInFlight); при исправлении журнал убрать.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Решение принято и записано: ингредиенты цикла возвращаются при сносе или потеря задокументирована
- [x] #2 Property-тест сохранения предметов не использует Ledger.lostInFlight (если выбран возврат)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Решение пользователя (2026-11-20): ингредиенты идущего цикла возвращаются в инвентарь при сносе, как в Factorio; они входят в проверку места (нет места — снос запрещён). Записано в docs/design.md. Реализация: contents() в buildings.ts, тесты в demolish.test.ts; Ledger.lostInFlight убран из propKit.
<!-- SECTION:NOTES:END -->
