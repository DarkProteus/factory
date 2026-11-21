---
id: TASK-63
title: Подсветка следующего выхода разделителя — заглушка
status: In Progress
assignee: []
created_date: '2026-11-21T12:59:00Z'
updated_date: '2026-11-21T13:00:00Z'
labels:
  - m3
dependencies: []
references:
  - render
type: bug
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/render/src/draw/buildingsM2.ts: splitterNext всегда возвращает выход 0, хотя style.md требует подсвечивать выход, куда пойдёт следующий предмет. Нужно брать очередь выходов из состояния разделителя.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Подсвечен выход, в который sim отправит следующий предмет
- [ ] #2 Тест render и скриншот; pnpm test зелёный
<!-- AC:END -->
