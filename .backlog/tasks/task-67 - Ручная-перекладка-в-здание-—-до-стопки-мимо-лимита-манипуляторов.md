---
id: TASK-67
title: Ручная перекладка в здание — до стопки, мимо лимита манипуляторов
status: In Progress
assignee: []
created_date: '2026-11-21T13:36:00Z'
updated_date: '2026-11-21T14:35:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
type: feature
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейчас putIntoBuilding (packages/sim/src/manual.ts) идёт через canAccept, поэтому игрок руками кладёт в лабораторию пакеты только на 2 единицы (LAB_BUFFER_UNITS), а в сборщик — ингредиенты только до inputBuffer. Решение: ручная перекладка принимает предмет в ячейку здания до стопки предмета (те же проверки «подходит ли предмет», без лимита запаса); манипуляторы по-прежнему ограничены запасом. Дописать правило в design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Руками в лабораторию кладётся до стопки пакетов активной технологии
- [ ] #2 Руками в сборщик кладутся ингредиенты рецепта до стопки
- [ ] #3 Манипулятор по-прежнему не кладёт сверх запаса (тест)
- [ ] #4 pnpm test зелёный
<!-- AC:END -->
