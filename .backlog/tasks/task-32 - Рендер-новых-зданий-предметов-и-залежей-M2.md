---
id: TASK-32
title: Рендер новых зданий, предметов и залежей M2
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T19:19:00Z'
labels:
  - m2
dependencies:
  - TASK-25
references:
  - render
modified_files:
  - docs/style.md
  - packages/render/src/palette.ts
  - packages/render/src/scene.ts
  - packages/render/src/overlay.ts
  - packages/render/src/draw/buildings.ts
  - packages/render/src/draw/buildingsM2.ts
  - packages/render/src/draw/buildingIcon.ts
  - packages/render/src/draw/ground.ts
  - packages/render/src/draw/items.ts
  - packages/render/src/draw/rocks.ts
  - packages/render/src/draw/lamps.test.ts
  - packages/render/src/scene.test.ts
  - packages/app/src/ui/theme.css
  - packages/app/src/ui/names.ts
type: feature
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer после того, как основная сессия допишет style.md (разделитель, сборщик, столб, генератор, новые предметы и залежи). Проверить скриншотом.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 style.md описывает новые здания, предметы и залежи
- [x] #2 Все здания и предметы M2 рисуются по style.md; скриншот проверен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
style.md дописан основной сессией (раздел «Сущности M2», токены палитры M2). Осталась реализация в render по style.md и скриншот. style.md близок к 300 строкам — при TASK-33 разделить.
<!-- SECTION:NOTES:END -->
