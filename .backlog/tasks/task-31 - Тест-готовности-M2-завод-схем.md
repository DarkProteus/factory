---
id: TASK-31
title: 'Тест готовности M2: завод схем'
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T22:53:00Z'
labels:
  - m2
dependencies:
  - TASK-28
  - TASK-27
  - TASK-26
references:
  - sim
modified_files:
  - packages/sim/src/milestone2.test.ts
type: chore
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Критерий готовности вехи из design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Сценарий: уголь → генератор; железо и медь → печи → провод → схемы в сборщиках → сундук; за 10 игровых минут в сундуке не меньше расчётного числа схем
- [x] #2 При половине генерации схем примерно вдвое меньше (в пределах допуска)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: узкое место — манипулятор провода K→C. Расчёт 387 схем, порог 348, при полной генерации 382. Половина генерации — 0.5 от установленной нагрузки 371 кВт: половина настоящего генератора на 900 кВт спрос покрыла бы. Схем 254, отношение 0.665 (допуск 0.45..0.75, обоснован в тесте).
<!-- SECTION:NOTES:END -->
