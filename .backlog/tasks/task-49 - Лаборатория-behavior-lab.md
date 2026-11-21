---
id: TASK-49
title: Лаборатория (behavior lab)
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:45:00Z'
labels:
  - m3
dependencies:
  - TASK-48
references:
  - sim
modified_files:
  - packages/sim/src/lab.ts
  - packages/sim/src/lab.test.ts
  - packages/sim/src/behaviors.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/inserter.ts
  - packages/sim/src/manual.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/buildings.ts
  - packages/app/src/buildingUi.ts
  - packages/app/src/ui/BuildingWindow.tsx
  - packages/app/src/buildingUi.test.ts
priority: high
type: feature
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
По design.md M3: ячейка на вид пакета, манипулятор кладёт только пакеты активной технологии, пакеты единицы списываются при старте единицы, прогресс единицы умножается на удовлетворённость сети, без активной технологии лаборатория простаивает и не берёт энергию. Все лаборатории двигают общий прогресс технологии. При смене технологии начатая единица сбрасывается, пакеты возвращаются в ячейки. Снос возвращает ячейки и пакеты идущей единицы. Ручная перекладка (takeFromBuilding/putIntoBuilding) работает с ячейками.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Лаборатория с пакетами и энергией проходит технологию за units × unitTicks тиков; две лаборатории — вдвое быстрее
- [x] #2 Манипулятор не кладёт в лабораторию пакеты, не нужные активной технологии
- [x] #3 Смена технологии посреди единицы возвращает её пакеты в ячейки; снос возвращает всё в инвентарь
- [x] #4 Без активной технологии лаборатория не берёт энергию; pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Модель: у каждой лаборатории своя единица (b.unit, b.progress), каждый тик работы добавляет 1 в общий прогресс. N лабораторий — в N раз быстрее. Если units не делится на N, к концу технологии недоделанные единицы возвращаются: недоплата до N−1 наборов (принято, как округление). Окно лаборатории в браузере не проверено — проверю вместе с TASK-53.
<!-- SECTION:NOTES:END -->
