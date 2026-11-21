---
id: TASK-84
title: 'Мутанты: сетка, постройка, бур, инвентарь, ручные действия'
status: In Progress
assignee: []
created_date: '2026-11-21T17:55:00Z'
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
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: grid.ts (18/2 — inBounds, проверка размера карты), buildings.ts (9 — проверка границ, подземный, счётчик topology), miner.ts (9 — границы области бура dy < h, dx < w), inventory.ts (9/1 — countOf, цикл добавления), manual.ts (6 — count <= 0), mining.ts (3 — границы и клетка ручной добычи).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Выжившие в grid.ts, buildings.ts, miner.ts, inventory.ts, manual.ts, mining.ts убиты или помечены эквивалентными
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
