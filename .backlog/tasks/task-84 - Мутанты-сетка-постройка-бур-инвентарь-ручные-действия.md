---
id: TASK-84
title: 'Мутанты: сетка, постройка, бур, инвентарь, ручные действия'
status: In Progress
assignee: []
created_date: '2026-11-21T17:55:00Z'
updated_date: '2026-11-21T19:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
modified_files:
  - packages/sim/src/bounds.test.ts
  - packages/sim/src/minerArea.test.ts
  - packages/sim/src/inventoryEdges.test.ts
  - packages/sim/src/miningEdges.test.ts
  - packages/sim/src/manualEdges.test.ts
  - packages/sim/src/buildingsEdges.test.ts
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
- [x] #1 Выжившие в grid.ts, buildings.ts, miner.ts, inventory.ts, manual.ts, mining.ts убиты или помечены эквивалентными
- [x] #2 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Проценты Stryker (убитые+таймаут / все мутанты файла), по своим 6 файлам: до → после. grid.ts 70.8 → 100.0; buildings.ts 93.2 → 98.3; miner.ts 88.9 → 100.0; inventory.ts 84.9 → 96.5; manual.ts 92.0 → 94.7; mining.ts 91.9 → 100.0. Итого 88.1 (474/538) → 98.1 (528/538). Новые тесты: bounds.test.ts, buildingsEdges.test.ts, minerArea.test.ts, inventoryEdges.test.ts, manualEdges.test.ts, miningEdges.test.ts. Код модулей не менялся.

Оставшиеся 10 выживших — эквивалентные мутанты (поведение не меняется). buildings.ts L107 (behavior === 'underground' -> true): insideSpan для не подземного типа всегда false, т.к. у соседа того же типа нет роли 'in'. buildings.ts L155 и L160 (проверка b.recipe/b.unit === undefined -> false): table[undefined] и technologies[undefined] дают undefined, тот же результат, что у ветки undefined. inventory.ts L47:39 (left > 0 -> true / left >= 0): при left == 0 цикл идёт дальше, но part = 0 и ячейки не меняются (непустые стеки — инвариант). inventory.ts L57 (i += 1 -> i -= 1): ветка достигается только когда left стал 0, цикл тут же кончается. manual.ts L89 (count <= 0 -> false / count < 0): при count <= 0 limit <= 0, цикл не идёт, ничего не меняется. manual.ts L96 (moved > 0 -> true / moved >= 0): removeItems с moved = 0 ничего не делает.
<!-- SECTION:NOTES:END -->
