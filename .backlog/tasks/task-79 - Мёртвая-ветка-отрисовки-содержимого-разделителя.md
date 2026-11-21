---
id: TASK-79
title: Мёртвая ветка отрисовки содержимого разделителя
status: In Progress
assignee: []
created_date: '2026-11-21T17:24:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - render
priority: low
type: chore
ordinal: 85000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Найдено аудитом TASK-70: в drawContents (render/src/scene.ts) ветка «splitter && b.output» никогда не срабатывает — буфер разделителя лежит в b.belt и рисуется веткой ленты. Удалить ветку, проверить глазами, что предмет в буфере разделителя и фильтрующего разделителя виден по центру.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ветка удалена, предмет в буфере разделителя виден (скриншот в .playwright-mcp/)
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
