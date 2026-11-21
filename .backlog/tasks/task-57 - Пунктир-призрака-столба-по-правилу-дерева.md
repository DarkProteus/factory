---
id: TASK-57
title: Пунктир призрака столба по правилу дерева
status: Done
assignee: []
created_date: '2026-11-21T12:13:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies: []
references:
  - render
modified_files:
  - packages/sim/src/network.ts
  - packages/sim/src/index.ts
  - packages/render/src/powerView.ts
  - packages/render/src/powerView.test.ts
type: feature
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
После TASK-46 провода — минимальное остовное дерево, а ghostLinks в packages/render/src/powerView.ts рисует пунктир призрака ко всем столбам в радиусе 7. В плотном заводе пунктир — снова паутина и не совпадает с проводами после постановки. Показывать пунктир по дереву, пересчитанному с призраком.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Пунктир призрака совпадает с проводами, которые появятся после постановки
- [x] #2 Скриншот плотного завода проверен; pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Из sim вынесена чистая wireTree(poles, defs); призрак получает id = max+1, как новое здание.
<!-- SECTION:NOTES:END -->
