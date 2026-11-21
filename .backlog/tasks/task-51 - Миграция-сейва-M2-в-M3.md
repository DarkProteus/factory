---
id: TASK-51
title: Миграция сейва M2 в M3
status: To Do
assignee: []
created_date: '2026-11-21T12:01:00Z'
labels:
  - m3
dependencies:
  - TASK-48
references:
  - save
type: feature
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейв M2 загружается с пустым прогрессом исследований и стартовым набором открытых рецептов; стоящие здания (в том числе разделители) остаются (design.md M3). Версия формата поднимается.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Сейв M2 из фикстуры загружается, здания и инвентарь на месте, исследования пустые
- [ ] #2 Сейв M3 сохраняется и загружается с прогрессом исследований
- [ ] #3 pnpm test зелёный
<!-- AC:END -->
