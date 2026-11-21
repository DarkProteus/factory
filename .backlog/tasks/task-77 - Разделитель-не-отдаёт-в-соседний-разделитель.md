---
id: TASK-77
title: Разделитель не отдаёт в соседний разделитель
status: Done
assignee: []
created_date: '2026-11-21T17:24:00Z'
updated_date: '2026-11-21T17:32:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/splitterChain.test.ts
  - packages/sim/src/splitter.ts
  - packages/sim/src/segments.ts
  - docs/design.md
priority: high
type: bug
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Найдено аудитом TASK-70. splitterOutputs (splitter.ts) считает выходом только ленту и вход подземного, поэтому цепочка «разделитель → разделитель» стоит: предмет навсегда остаётся в буфере первого. Проверено прогоном: лента → splitter → splitter → лента, через 200 тиков предмет в буфере первого. В Factorio разделители ставят каскадом. Решение: выход разделителя — также разделитель (обычный или фильтрующий), если тот смотрит в ту же сторону, что и выход (вход сзади, как у feedsSplitter), и его буфер пуст.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Предмет проходит цепочку splitter → splitter и splitter → filterSplitter (тест)
- [x] #2 Боковой выход разделителя в разделитель, смотрящий в сторону выхода, работает; в разделитель, смотрящий иначе, — нет
- [x] #3 Порядок обработки сегментов (segments.ts) учитывает разделитель как цель: нет задержки и потерь
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
splitterOutputs считает выходом соседний разделитель, смотрящий в сторону выхода; runSplitter кладёт в него через pushToSplitter. order() не менялся: выходы разделителя уже в next. Тест: splitterChain.test.ts (8 тестов).
<!-- SECTION:NOTES:END -->
