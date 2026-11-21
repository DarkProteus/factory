---
id: TASK-45
title: Кнопки мышью для действий с горячими клавишами
status: Done
assignee: []
created_date: '2026-11-21T00:09:00Z'
updated_date: '2026-11-21T12:13:00Z'
labels:
  - m3
dependencies: []
references:
  - ui
modified_files:
  - docs/style-ui.md
  - packages/app/src/ui/ActionButtons.tsx
  - packages/app/src/ui/ActionButtons.test.tsx
  - packages/app/src/ui/BuildPanel.tsx
  - packages/app/src/game.ts
  - packages/app/src/ui/ui.css
  - .groma/systems/factory/containers/browser-game/components/ui.md
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Плейтест 2026-11-21: неудобно, что многое доступно только с клавиатуры. Дать мышиные кнопки для поворота (R), инвентаря (E), сноса (X), кирки (M) и снятия инструмента (Esc); клавиша подписана на каждой кнопке. Сначала основная сессия дописывает раскладку в docs/style-ui.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Каждое действие с горячей клавишей доступно и кнопкой мышью
- [x] #2 На кнопке подписана её клавиша
- [x] #3 Скриншот проверен
- [x] #4 Раскладка кнопок описана в docs/style-ui.md до реализации
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Кнопка «Снять инструмент» снимает инструмент всегда (clearTool), а клавиша Esc при открытом окне сначала закрывает окно — так задумано, подпись кнопки говорит о действии.
<!-- SECTION:NOTES:END -->
