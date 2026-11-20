---
id: TASK-24
title: Исходный запас залежи в состоянии sim
status: To Do
assignee: []
created_date: '2026-11-20T17:06:00Z'
labels: []
dependencies: []
references:
  - sim
type: bug
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
render считает число камней на залежи от исходного запаса, но узнаёт его только при первом показе (DepositLayer). После загрузки сохранения (TASK-23) исходный запас неизвестен, и частично выработанные залежи рисуются полными, по 5 камней. Нужно хранить исходный запас в Deposit (поле initial) и рисовать по нему.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 У Deposit в sim есть исходный запас; createMap заполняет его из amount
- [ ] #2 Сохранение и загрузка переносят исходный запас; save валидирует поле
- [ ] #3 render берёт исходный запас из состояния, свой кеш DepositLayer.initial убран
- [ ] #4 Тест: после save/load число камней частично выработанной залежи то же, что до сохранения
<!-- AC:END -->
