---
id: TASK-67
title: Ручная перекладка в здание — до стопки, мимо лимита манипуляторов
status: Done
assignee: []
created_date: '2026-11-21T13:36:00Z'
updated_date: '2026-11-21T14:41:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/buildings.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/lab.ts
  - packages/sim/src/manual.ts
  - packages/app/src/buildingUi.ts
  - packages/sim/src/manual.test.ts
  - packages/sim/src/lab.test.ts
type: feature
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейчас putIntoBuilding (packages/sim/src/manual.ts) идёт через canAccept, поэтому игрок руками кладёт в лабораторию пакеты только на 2 единицы (LAB_BUFFER_UNITS), а в сборщик — ингредиенты только до inputBuffer. Решение: ручная перекладка принимает предмет в ячейку здания до стопки предмета (те же проверки «подходит ли предмет», без лимита запаса); манипуляторы по-прежнему ограничены запасом. Дописать правило в design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Руками в лабораторию кладётся до стопки пакетов активной технологии
- [x] #2 Руками в сборщик кладутся ингредиенты рецепта до стопки
- [x] #3 Манипулятор по-прежнему не кладёт сверх запаса (тест)
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AcceptLimit 'buffer' | 'stack' в canAccept; manual и подсветка в app передают 'stack'. После ручной перекладки сверх запаса манипуляторы ждут, пока запас не израсходуется.
<!-- SECTION:NOTES:END -->
