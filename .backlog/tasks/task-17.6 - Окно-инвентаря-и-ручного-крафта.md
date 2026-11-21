---
id: TASK-17.6
title: Окно инвентаря и ручного крафта
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m2
milestone: m-2
dependencies:
  - TASK-17.4
references:
  - ui
modified_files:
  - packages/app/src/App.tsx
  - packages/app/src/game.ts
  - packages/app/src/craftUi.ts
  - packages/app/src/craftUi.test.ts
  - packages/app/src/ui/BuildPanel.tsx
  - packages/app/src/ui/names.ts
  - packages/app/src/ui/CraftQueue.tsx
  - packages/app/src/ui/InventoryWindow.tsx
  - packages/app/src/ui/ItemSlot.tsx
  - packages/app/src/ui/inventory.css
  - packages/app/src/ui/useTick.ts
  - packages/render/src/renderer.ts
parent_task_id: TASK-17
type: feature
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Клавиша E открывает окно: слева инвентарь, справа рецепты madeIn: assembler
- [x] #2 Рецепт без ингредиентов серый; клик — craft 1, Shift+клик — craft 5
- [x] #3 Очередь с прогрессом видна внизу экрана и при закрытом окне; клик по элементу очереди — отмена
- [x] #4 Скриншот проверен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: Shift+клик крафтит сколько хватит, до 5 (раньше при запасе меньше чем на 5 sim молча игнорировал команду). Скриншот общего экрана после слияния 17.5/17.6/17.7 проверен.
<!-- SECTION:NOTES:END -->
