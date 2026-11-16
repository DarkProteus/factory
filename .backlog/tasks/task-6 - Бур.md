---
id: TASK-6
title: Бур
status: Done
assignee: []
created_date: '2026-11-16T15:55:00Z'
updated_date: '2026-11-16T17:43:00Z'
labels: []
dependencies:
  - TASK-5
references:
  - sim
  - content
documentation:
  - docs/design.md
modified_files:
  - packages/sim/src/miner.test.ts
  - packages/content/src/types.ts
  - packages/content/src/buildings.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/miner.ts
  - packages/sim/src/behaviors.ts
  - packages/sim/src/tick.ts
  - packages/sim/src/index.ts
  - packages/sim/src/grid.test.ts
  - .groma/systems/factory/containers/browser-game/components/sim.md
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Система «Добыча» и первое поведение `miner`: бур стоит на залежи и выдаёт руду. Это начало цепочки «руда сама превращается в пластины». Скорость добычи — число из `content`, а не константа в ядре.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Здание бура описано в `content` с `behavior: miner` и числом тиков на единицу руды
- [x] #2 Бур на залежи выдаёт одну руду за заданное число тиков (проверено на нескольких циклах подряд)
- [x] #3 Тип руды соответствует залежи под буром
- [x] #4 Бур на клетке без залежи не выдаёт ничего
- [x] #5 Когда выходной буфер бура заполнен, добыча останавливается и руда не теряется
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Решения основной сессии:
1. В BuildingDef два необязательных поля: miningTicks (тиков на единицу руды) и buffer (вместимость выходного буфера, шт.). Бур в content: miningTicks 60 (1 руда/с), buffer 5.
2. У каждого PlacedBuilding есть рабочее состояние: progress (накопленные тики цикла) и output ({item, count} | null). Это простые данные, они попадают в хеш и в сохранение.
3. Тик: сначала команды, потом поведения зданий по возрастанию id. Поведение выбирается по BuildingDef.behavior. Пока реализован только miner, остальные ничего не делают.
4. Бур добывает из клеток своего отпечатка: первая непустая залежь в порядке строк (сверху вниз, слева направо). Тип руды берётся из этой залежи.
5. Залежь конечна: amount уменьшается на 1 за единицу руды, на 0 клетка становится null.
6. Цикл: если залежи нет или буфер полон (или в нём другой предмет), progress не растёт. Иначе progress += 1. Когда progress = miningTicks, в буфер кладётся 1 руда, progress = 0. Первая руда появляется через miningTicks тиков после постройки.
7. Буфер из бура пока никто не забирает: выгрузку на конвейер сделает TASK-7, манипулятор — TASK-8.
<!-- SECTION:PLAN:END -->
