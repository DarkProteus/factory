---
id: TASK-17.5
title: 'Панель стройки: число предметов-зданий'
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m2
milestone: m-2
dependencies:
  - TASK-17.1
references:
  - ui
modified_files:
  - packages/app/src/input.ts
  - packages/app/src/input.test.ts
  - packages/app/src/game.ts
  - packages/app/src/ui/BuildPanel.tsx
  - packages/app/src/ui/ui.css
parent_task_id: TASK-17
type: feature
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 На кнопке здания число его предметов в инвентаре; при нуле кнопка серая и не выбирается
- [x] #2 После постройки последнего экземпляра режим стройки сбрасывается
<!-- AC:END -->
