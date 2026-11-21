---
id: TASK-86
title: Предмет в буфере закрывает иконку фильтра разделителя
status: Done
assignee: []
created_date: '2026-11-21T18:33:00Z'
updated_date: '2026-11-21T19:33:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - render
modified_files:
  - docs/style-m3.md
  - packages/render/src/scene.ts
priority: low
type: bug
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Найдено на ревью TASK-79 (скриншот .playwright-mcp/task-79.png): у фильтрующего разделителя иконка фильтра (8 px) и предмет буфера рисуются в центре ромба, предмет полностью закрывает фильтр — пока в буфере что-то лежит, фильтр не виден. Решение (визуальное, основная сессия): сначала дописать в docs/style.md, где у фильтрующего разделителя рисуется фильтр, а где предмет буфера (например, фильтр — в углу ромба рядом с воронкой, предмет — в центре), потом реализовать в drawContents (render/src/scene.ts).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Правило в docs/style.md
- [x] #2 Фильтр и предмет буфера видны одновременно (скриншот в .playwright-mcp/)
- [x] #3 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Решение: фильтр — настройка, остаётся в центре ромба; предмет буфера при заданном фильтре — на полотне входа у заднего края (центр иконки в 4 px от края). Без фильтра — в центре, как у разделителя M2. Скриншот .playwright-mcp/task-86.png.
<!-- SECTION:NOTES:END -->
