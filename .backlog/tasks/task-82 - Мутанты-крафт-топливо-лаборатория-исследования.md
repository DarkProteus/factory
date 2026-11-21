---
id: TASK-82
title: 'Мутанты: крафт, топливо, лаборатория, исследования'
status: In Progress
assignee: []
created_date: '2026-11-21T17:54:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
priority: medium
type: chore
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: fuel.ts (17/1 — проверка вида топлива и стопки), crafter.ts (16/1 — проверка ингредиента рецепта), lab.ts (12/3 — ветка создания b.input не покрыта), research.ts (6/1 — выбор активной технологии), assembler.ts (3 — защита setRecipe), craftQueue.ts (6 — count <= 0, .some против .every в проверке материалов).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Выжившие в fuel.ts, crafter.ts, lab.ts, research.ts, assembler.ts, craftQueue.ts убиты или помечены эквивалентными
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
