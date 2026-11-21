---
id: TASK-61
title: Подсказка карточки исследования обрезается у края экрана
status: Done
assignee: []
created_date: '2026-11-21T12:48:00Z'
updated_date: '2026-11-21T13:12:00Z'
labels:
  - m3
dependencies: []
references:
  - ui
modified_files:
  - packages/app/src/techUi.ts
  - packages/app/src/techUi.test.ts
  - packages/app/src/ui/ResearchWindow.tsx
  - packages/app/src/ui/research.css
type: bug
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Подсказка карточки в окне исследований выходит за правый край экрана (скриншот task55-4). Подсказка должна оставаться в пределах экрана: при нехватке места справа — показываться слева от курсора.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Подсказка карточки целиком на экране у любой карточки
- [x] #2 Скриншот проверен; pnpm test зелёный
<!-- AC:END -->
