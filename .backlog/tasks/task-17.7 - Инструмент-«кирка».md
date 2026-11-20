---
id: TASK-17.7
title: Инструмент «кирка»
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:43:00Z'
labels:
  - m2
dependencies:
  - TASK-17.3
references:
  - ui
modified_files:
  - packages/app/src/input.ts
  - packages/app/src/input.test.ts
  - packages/app/src/game.ts
  - packages/app/src/ui/MineButton.tsx
  - packages/app/src/ui/MineButton.test.tsx
  - packages/app/src/ui/BuildPanel.tsx
  - packages/app/src/ui/ui.css
parent_task_id: TASK-17
type: feature
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Кнопка на панели и клавиша M включают кирку; зажатая кнопка мыши на залежи шлёт startMining, отпускание или уход с клетки — stopMining
- [x] #2 Кирка не конфликтует со стройкой и сносом
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: кнопка кирки перенесена в одну панель со сносом, цвета иконки по style-ui (рукоять steel-light, железко steel); тесты кирки вынесены в mine.test.ts (лимит 300 строк).
<!-- SECTION:NOTES:END -->
