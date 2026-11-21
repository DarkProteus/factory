---
id: TASK-56
title: 'Тест готовности M3: завод пакетов'
status: In Progress
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:46:00Z'
labels:
  - m3
dependencies:
  - TASK-49
references:
  - sim
type: chore
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Тест в sim по design.md M3: готовый завод красных и зелёных пакетов с лабораториями проходит logistics, scienceGreen и steel за заданное число игровых минут; при урезанной генерации — пропорционально дольше.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Завод проходит три технологии за заданное время
- [ ] #2 При урезанной генерации время растёт пропорционально; pnpm test зелёный
<!-- AC:END -->
