---
id: TASK-24
title: Исходный запас залежи в состоянии sim
status: Done
assignee: []
created_date: '2026-11-20T17:06:00Z'
updated_date: '2026-11-20T18:45:00Z'
labels: []
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/grid.ts
  - packages/sim/src/grid.test.ts
  - packages/sim/src/miner.test.ts
  - packages/save/src/index.ts
  - packages/save/src/validate.ts
  - packages/save/src/index.test.ts
  - packages/render/src/draw/ground.ts
  - packages/render/src/index.ts
  - packages/app/src/deposits.test.ts
type: bug
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
render считает число камней на залежи от исходного запаса, но узнаёт его только при первом показе (DepositLayer). После загрузки сохранения (TASK-23) исходный запас неизвестен, и частично выработанные залежи рисуются полными, по 5 камней. Нужно хранить исходный запас в Deposit (поле initial) и рисовать по нему.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 У Deposit в sim есть исходный запас; createMap заполняет его из amount
- [x] #2 Сохранение и загрузка переносят исходный запас; save валидирует поле
- [x] #3 render берёт исходный запас из состояния, свой кеш DepositLayer.initial убран
- [x] #4 Тест: после save/load число камней частично выработанной залежи то же, что до сохранения
<!-- AC:END -->
