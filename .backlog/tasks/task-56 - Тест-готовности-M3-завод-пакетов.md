---
id: TASK-56
title: 'Тест готовности M3: завод пакетов'
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T13:00:00Z'
labels:
  - m3
dependencies:
  - TASK-49
references:
  - sim
modified_files:
  - packages/sim/src/milestone3.test.ts
  - packages/sim/src/milestone3.layout.ts
type: chore
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Тест в sim по design.md M3: готовый завод красных и зелёных пакетов с лабораториями проходит logistics, scienceGreen и steel за заданное число игровых минут; при урезанной генерации — пропорционально дольше.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Завод проходит три технологии за заданное время
- [x] #2 При урезанной генерации время растёт пропорционально; pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Полная генерация: logistics 2005, scienceGreen 6505, steel 15957 тиков (идеал 15000), лимит 5,5 мин. «Пропорционально дольше» проверяется как время ≈ энергия / выработка при дефиците (1/3 мощности: 23058 тиков, допуск 10 %): при половине генераторов дефицита нет (спрос ~1700 кВт < 1800), время почти не растёт. Найден баг буфера лаборатории — TASK-64; в раскладке обойдён одной лабораторией на узел.
<!-- SECTION:NOTES:END -->
