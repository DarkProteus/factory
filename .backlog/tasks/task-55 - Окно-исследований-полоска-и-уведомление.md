---
id: TASK-55
title: Окно исследований, полоска и уведомление
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:48:00Z'
labels:
  - m3
dependencies:
  - TASK-48
  - TASK-54
  - TASK-45
references:
  - ui
modified_files:
  - docs/style-ui.md
  - packages/app/src/techUi.ts
  - packages/app/src/techUi.test.ts
  - packages/app/src/ui/ResearchWindow.tsx
  - packages/app/src/ui/ResearchBar.tsx
  - packages/app/src/ui/research.css
  - packages/app/src/game.ts
  - packages/app/src/buildingUi.ts
  - packages/app/src/craftUi.ts
  - packages/app/src/input.ts
  - packages/app/src/ui/ActionButtons.tsx
  - packages/app/src/ui/BuildPanel.tsx
  - packages/app/src/ui/InventoryWindow.tsx
  - packages/app/src/ui/BuildingWindow.tsx
  - packages/app/src/App.tsx
  - packages/app/src/ui/names.ts
type: feature
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
По style-ui.md: окно по T и кнопке, дерево слоями слева направо, клик по доступной технологии — setResearch. Полоска активного исследования вверху, «Выберите исследование» без активной. Уведомление «Изучено: …» на 4 с. Закрытые здания скрыты на панели стройки, закрытые рецепты — в окне крафта и выборе рецепта сборщика.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Окно открывается по T и кнопкой, клик по доступной технологии делает её активной
- [x] #2 Полоска и уведомление работают по style-ui.md
- [x] #3 Закрытые здания и рецепты скрыты в панели стройки, окне крафта и окне сборщика
- [x] #4 Скриншот проверен
<!-- AC:END -->
