---
id: TASK-89
title: Тест полоски исследования (правило research-bar)
status: To Do
assignee: []
created_date: '2026-11-21T19:39:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - ui
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Правило design.md research-bar (M3, «Интерфейс»): вверху всегда видна полоска активного исследования; без активной — «Выберите исследование»; по завершении — уведомление «Изучено: …» на 4 с. Тестов нет (найдено pnpm rules, TASK-75). Логика в packages/app/src/techUi.ts, game.ts, ui/ResearchBar.tsx. Тест пометить комментарием // rule: research-bar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Тест: без активной технологии текст «Выберите исследование»
- [ ] #2 Тест: с активной технологией — имя и доля прогресса
- [ ] #3 Тест: после завершения «Изучено: …» видно 4 с и затем исчезает
- [ ] #4 pnpm rules не показывает research-bar, pnpm test зелёный
<!-- AC:END -->
