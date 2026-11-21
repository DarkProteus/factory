---
id: TASK-58
title: Разделитель отдаёт на вход подземного конвейера
status: Done
assignee: []
created_date: '2026-11-21T12:32:00Z'
updated_date: '2026-11-21T12:35:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/splitter.ts
  - packages/sim/src/underground.test.ts
type: feature
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
splitterOutputs (splitter.ts) принимает только конвейер, поэтому разделитель не может отдавать прямо на вход подземного, который стоит вплотную к нему. Разрешить выход на вход подземного того же направления, что и выход (acceptsBeltFrom из underground.ts).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Разделитель отдаёт предметы на вход подземного, смотрящий от него, и не отдаёт на выход подземного
- [x] #2 pnpm test зелёный
<!-- AC:END -->
