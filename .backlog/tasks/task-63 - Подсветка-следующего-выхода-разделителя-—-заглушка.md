---
id: TASK-63
title: Подсветка следующего выхода разделителя — заглушка
status: Done
assignee: []
created_date: '2026-11-21T12:59:00Z'
updated_date: '2026-11-21T13:17:00Z'
labels:
  - m3
dependencies: []
references:
  - render
modified_files:
  - packages/sim/src/splitter.ts
  - packages/sim/src/index.ts
  - packages/render/src/draw/buildingsM2.ts
  - packages/render/src/draw/m3.ts
type: bug
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/render/src/draw/buildingsM2.ts: splitterNext всегда возвращает выход 0, хотя style.md требует подсвечивать выход, куда пойдёт следующий предмет. Нужно брать очередь выходов из состояния разделителя.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Подсвечен выход, в который sim отправит следующий предмет
- [x] #2 Тест render и скриншот; pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Правило в sim: splitterNextOutput. Подсветка по указателю очереди, без учёта заблокированных выходов (если выход занят, sim отдаст следующему).
<!-- SECTION:NOTES:END -->
