---
id: TASK-58
title: Разделитель отдаёт на вход подземного конвейера
status: To Do
assignee: []
created_date: '2026-11-21T12:32:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
type: feature
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
splitterOutputs (splitter.ts) принимает только конвейер, поэтому разделитель не может отдавать прямо на вход подземного, который стоит вплотную к нему. Разрешить выход на вход подземного того же направления, что и выход (acceptsBeltFrom из underground.ts).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Разделитель отдаёт предметы на вход подземного, смотрящий от него, и не отдаёт на выход подземного
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
