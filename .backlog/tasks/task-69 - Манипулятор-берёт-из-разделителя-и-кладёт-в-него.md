---
id: TASK-69
title: Манипулятор берёт из разделителя и кладёт в него
status: Done
assignee: []
created_date: '2026-11-21T16:38:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/inserterSplitter.test.ts
  - packages/sim/src/transfer.ts
  - docs/design.md
type: bug
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Плейтест: манипулятор не работает с разделителем без конвейера — в transfer.ts у takeFrom и canAccept нет веток splitter/filterSplitter. В Factorio манипулятор берёт с разделителя и кладёт на него. Решение (основная сессия): манипулятор берёт предмет из буфера разделителя (b.belt, один предмет) напрямую, вне круга выходов — манипуляторы ходят в тике раньше лент, поэтому свободный манипулятор получает предмет первым, ленты — остальное. Класть в разделитель можно, когда буфер пуст. Фильтр filterSplitter манипулятор не учитывает: берёт то, что лежит в буфере. Дописать правило в design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Манипулятор забирает предмет из буфера splitter и filterSplitter (тест: лента → разделитель → манипулятор → сундук, без выходных лент)
- [x] #2 Манипулятор кладёт в разделитель с пустым буфером, предмет уходит на выходные ленты
- [x] #3 Предметы не теряются и не дублируются (инвариант числа предметов)
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ветки splitter/filterSplitter в takeFrom/canAccept/accept (transfer.ts). Буфер разделителя принимает только манипуляторы (limit 'buffer'): руками по-прежнему нельзя (TASK-37). Тест: inserterSplitter.test.ts.
<!-- SECTION:NOTES:END -->
