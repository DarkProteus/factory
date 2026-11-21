---
id: TASK-37
title: Фильтрующий разделитель
status: In Progress
assignee: []
created_date: '2026-11-20T18:39:00Z'
updated_date: '2026-11-21T12:23:00Z'
labels:
  - m3
dependencies:
  - TASK-47
references:
  - sim
priority: low
type: feature
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Разделитель с фильтром по предмету (design.md, «Веха M3: решения»). Фильтр — один предмет, выбирается в окне здания (команда в sim).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Подходящие предметы идут только вперёд; если впереди занято, ждут на входе
- [ ] #2 Остальные предметы идут влево и вправо по кругу; без фильтра — как обычный разделитель
- [ ] #3 Фильтр задаётся командой, хранится в состоянии и сейве, входит в хеш; окно здания позволяет его выбрать
- [ ] #4 pnpm test зелёный
<!-- AC:END -->
