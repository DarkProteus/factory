---
id: TASK-57
title: Пунктир призрака столба по правилу дерева
status: In Progress
assignee: []
created_date: '2026-11-21T12:13:00Z'
updated_date: '2026-11-21T13:00:00Z'
labels:
  - m3
dependencies: []
references:
  - render
type: feature
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
После TASK-46 провода — минимальное остовное дерево, а ghostLinks в packages/render/src/powerView.ts рисует пунктир призрака ко всем столбам в радиусе 7. В плотном заводе пунктир — снова паутина и не совпадает с проводами после постановки. Показывать пунктир по дереву, пересчитанному с призраком.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Пунктир призрака совпадает с проводами, которые появятся после постановки
- [ ] #2 Скриншот плотного завода проверен; pnpm test зелёный
<!-- AC:END -->
