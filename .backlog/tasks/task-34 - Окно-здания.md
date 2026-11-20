---
id: TASK-34
title: Окно здания
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T22:57:00Z'
labels:
  - m2
dependencies:
  - TASK-30
  - TASK-27
references:
  - ui
modified_files:
  - packages/app/src/buildingUi.ts
  - packages/app/src/buildingUi.test.ts
  - packages/app/src/ui/BuildingWindow.tsx
  - packages/app/src/ui/building.css
  - packages/app/src/ui/RecipeTip.tsx
  - packages/app/src/ui/InventoryWindow.tsx
  - packages/app/src/ui/ItemSlot.tsx
  - packages/app/src/ui/inventory.css
  - packages/app/src/game.ts
  - packages/app/src/App.tsx
  - docs/style-ui.md
type: feature
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Клик по зданию открывает окно: содержимое, статус, прогресс; у сундука — его ячейки
- [x] #2 У сборщика выбор рецепта (setRecipe)
- [x] #3 Клик по ячейке здания — takeFromBuilding; клик по предмету инвентаря при открытом окне — putIntoBuilding
- [x] #4 Скриншот проверен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: конфликт с TASK-33 в game.ts и App.tsx (импорты и JSX) разрешён вручную. После слияния окно и сводка сети проверены вживую в одной сборке, снимки .playwright-mcp/m2-merged-*.png. Статус генератора «Нет нагрузки» дописан в style-ui.
<!-- SECTION:NOTES:END -->
