---
id: TASK-51
title: Миграция сейва M2 в M3
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies:
  - TASK-48
references:
  - save
modified_files:
  - packages/save/src/index.ts
  - packages/save/src/validateResearch.ts
  - packages/save/src/validate.ts
  - packages/save/tsconfig.json
  - packages/sim/src/index.ts
  - packages/save/src/migrate.test.ts
  - packages/save/src/fixtures/save-m2.json
  - packages/app/src/persist.test.ts
type: feature
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейв M2 загружается с пустым прогрессом исследований и стартовым набором открытых рецептов; стоящие здания (в том числе разделители) остаются (design.md M3). Версия формата поднимается.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Сейв M2 из фикстуры загружается, здания и инвентарь на месте, исследования пустые
- [x] #2 Сейв M3 сохраняется и загружается с прогрессом исследований
- [x] #3 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Фикстура save-m2.json — реконструкция формата версии 3 текущим кодом без research/events (не снята с коммита 5f01002); все изменения SimState с M2 — добавления, поэтому формат совпадает.
<!-- SECTION:NOTES:END -->
