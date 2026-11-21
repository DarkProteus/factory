---
id: TASK-37
title: Фильтрующий разделитель
status: Done
assignee: []
created_date: '2026-11-20T18:39:00Z'
updated_date: '2026-11-21T12:32:00Z'
labels:
  - m3
dependencies:
  - TASK-47
references:
  - sim
modified_files:
  - docs/style-ui.md
  - packages/sim/src/splitter.ts
  - packages/sim/src/segments.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/filterSplitter.test.ts
  - packages/save/src/validate.ts
  - packages/save/src/index.test.ts
  - packages/app/src/buildingUi.ts
  - packages/app/src/buildingUi.test.ts
  - packages/app/src/ui/BuildingWindow.tsx
  - packages/app/src/ui/building.css
  - packages/app/src/ui/names.ts
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
- [x] #1 Подходящие предметы идут только вперёд; если впереди занято, ждут на входе
- [x] #2 Остальные предметы идут влево и вправо по кругу; без фильтра — как обычный разделитель
- [x] #3 Фильтр задаётся командой, хранится в состоянии и сейве, входит в хеш; окно здания позволяет его выбрать
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Фильтр — необязательное поле filter (нет поля — нет фильтра). Предмет-фильтр не сдвигает круг боковых выходов.
<!-- SECTION:NOTES:END -->
