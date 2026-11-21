---
id: TASK-7
title: Конвейер
status: Done
assignee: []
created_date: '2026-11-16T15:55:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels: []
milestone: m-1
dependencies:
  - TASK-5
references:
  - sim
  - content
documentation:
  - docs/design.md
modified_files:
  - packages/content/src/types.ts
  - packages/content/src/buildings.ts
  - packages/sim/src/belt.test.ts
  - packages/sim/src/belt.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/behaviors.ts
  - packages/sim/src/index.ts
  - .groma/systems/factory/containers/browser-game/components/sim.md
  - .groma/systems/factory/containers/browser-game/components/belt.md
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Система «Конвейеры», поведение `belt`: переносит предметы между зданиями. Упрощение первой версии: у конвейера один ряд предметов, без двух полос. Известный риск — конвейеры тормозят на больших заводах; дизайн-док предлагает хранить конвейер сегментами, а не по одному предмету. Разделители и подземные участки относятся к M2 и в задачу не входят.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Здание конвейера описано в `content` с `behavior: belt` и скоростью
- [x] #2 Предмет проходит прямой участок из 10 клеток за расчётное число тиков, выведенное из скорости в `content`
- [x] #3 При заторе в конце очередь стоит, предметы не теряются и не накладываются; после снятия затора движение продолжается
- [x] #4 Предмет проходит поворот налево и направо и попадает на следующий конвейер
- [x] #5 Порядок предметов на конвейере сохраняется
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Решение (основная сессия):
- Здание `belt` в content: size 1x1, behavior belt, `beltSpeed` — единиц пути за тик. Клетка конвейера = BELT_CELL = 256 единиц (константа sim), минимальный зазор между предметами BELT_GAP = 64 (4 предмета на клетку). beltSpeed 8 → 32 тика на клетку, 1.875 клетки/с при 60 тиках/с.
- Хранение M1: у каждого конвейера свой ряд `PlacedBuilding.belt: {item, pos}[]`, pos — целое 0..BELT_CELL от входа, порядок от головы к хвосту. Только целые числа, JSON без потерь.
- Цель конвейера — здание в соседней клетке по его направлению, если это конвейер, который не смотрит навстречу. Вход в цель всегда в начало ряда (pos 0) — и для поворотов, и для бокового подвоза (один ряд, без полос).
- Порядок шага: сначала остальные поведения по id, затем конвейеры от низа по течению к верху (каждый после своей цели), чтобы плотный поток шёл без рывков. В замкнутом кольце порядок начинается с меньшего id, возможен рывок в один зазор; предметы не теряются.
- Без цели предмет стоит в конце клетки (pos = BELT_CELL). Переход: голова, у которой pos >= BELT_CELL, переходит в цель с pos - BELT_CELL; зазор через границу клеток соблюдается.
- `pushToBelt(b, item)` кладёт предмет в начало ряда, если есть зазор, — понадобится манипулятору (TASK-8).
- Сегменты вместо поклеточного хранения и бенчмарк — отдельная задача M2 (риск из design.md).
<!-- SECTION:PLAN:END -->
