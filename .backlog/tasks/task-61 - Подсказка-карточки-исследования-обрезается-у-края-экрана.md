---
id: TASK-61
title: Подсказка карточки исследования обрезается у края экрана
status: In Progress
assignee: []
created_date: '2026-11-21T12:48:00Z'
updated_date: '2026-11-21T13:00:00Z'
labels:
  - m3
dependencies: []
references:
  - ui
type: bug
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Подсказка карточки в окне исследований выходит за правый край экрана (скриншот task55-4). Подсказка должна оставаться в пределах экрана: при нехватке места справа — показываться слева от курсора.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Подсказка карточки целиком на экране у любой карточки
- [ ] #2 Скриншот проверен; pnpm test зелёный
<!-- AC:END -->
