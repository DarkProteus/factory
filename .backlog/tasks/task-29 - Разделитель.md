---
id: TASK-29
title: Разделитель
status: In Progress
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:19:00Z'
labels:
  - m2
dependencies:
  - TASK-25
  - TASK-15
references:
  - sim
modified_files:
  - packages/sim/src/belt.ts
  - packages/sim/src/segments.ts
  - packages/sim/src/splitter.ts
  - packages/sim/src/splitter.test.ts
  - packages/sim/src/behaviors.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/belt.bench.test.ts
type: feature
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. После TASK-15, чтобы не править конвейеры дважды.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Предметы со входа сзади раздаются по кругу на выходы вперёд, влево, вправо, где стоит принимающая лента
- [ ] #2 Занятый или пустой выход пропускается; при заторе всех выходов предметы стоят и не теряются
- [ ] #3 Разделитель энергии не берёт; бенчмарк TASK-15 с разделителями укладывается в бюджет
<!-- AC:END -->
