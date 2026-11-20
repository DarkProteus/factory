---
id: TASK-15
title: Конвейеры сегментами и бенчмарк
status: In Progress
assignee: []
created_date: '2026-11-16T17:48:00Z'
updated_date: '2026-11-20T18:45:00Z'
labels: []
dependencies: []
references:
  - sim
type: chore
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M2. Риск из design.md: конвейеры тормозят на больших заводах. Сейчас (TASK-7) у каждого конвейера свой ряд предметов, а порядок обработки пересчитывается каждый тик. Перейти на хранение цепочек конвейеров сегментами и добавить тест-бенчмарк.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Тест-бенчмарк: завод из N конвейеров укладывается в бюджет тика
- [ ] #2 Поведение конвейера и тесты из TASK-7 не меняются
<!-- AC:END -->
