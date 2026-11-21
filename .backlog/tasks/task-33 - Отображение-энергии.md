---
id: TASK-33
title: Отображение энергии
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m2
milestone: m-2
dependencies:
  - TASK-28
  - TASK-32
references:
  - render
  - ui
modified_files:
  - packages/render/src/powerView.ts
  - packages/render/src/powerDraw.ts
  - packages/render/src/powerView.test.ts
  - packages/render/src/palette.ts
  - packages/render/src/overlay.ts
  - packages/render/src/scene.ts
  - packages/render/src/scene.test.ts
  - packages/app/src/powerSummary.ts
  - packages/app/src/powerSummary.test.ts
  - packages/app/src/ui/NetSummaryTip.tsx
  - packages/app/src/ui/netSummary.css
  - packages/app/src/ui/theme.css
  - packages/app/src/input.ts
  - packages/app/src/game.ts
  - packages/app/src/App.tsx
  - docs/style.md
  - .groma/systems/factory/containers/browser-game/components/render.md
  - .groma/systems/factory/containers/browser-game/components/ui.md
type: feature
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Зона 5×5 видна у призрака столба и у стоящих столбов в режиме стройки столба
- [x] #2 Провода между соединёнными столбами; значки «нет энергии» и «нет топлива» над зданием
- [x] #3 Под курсором видны выработка и спрос сети; скриншот проверен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью основной сессии: значки были почти не видны. Тёмная подложка на тёмной земле, а формула мигания из style.md давала α от 0.1 до 1. Подложка стала bad, мигание теперь 0.775 + 0.225 × sin, это α от 0.55 до 1. style.md поправлен.
<!-- SECTION:NOTES:END -->
