---
id: TASK-50
title: 'Быстрые конвейер, подземный и манипулятор: разные скорости лент'
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:46:00Z'
labels:
  - m3
dependencies:
  - TASK-47
  - TASK-36
references:
  - sim
modified_files:
  - packages/sim/src/fastBelt.test.ts
type: feature
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
fastBelt и fastUndergroundBelt со скоростью вдвое выше, fastInserter со взмахом 15 тиков (design.md M3). Скорость берётся из beltSpeed каждого здания; проверить и при нужде доработать переход предмета между сегментами с разной скоростью в segments.ts. Бенчмарк конвейеров не должен ухудшиться.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Предмет переходит с быстрой ленты на медленную и обратно без потерь и наложений
- [x] #2 Пропускная способность быстрой ленты вдвое выше обычной; быстрый манипулятор переносит вдвое чаще
- [x] #3 pnpm test зелёный, бенчмарк конвейеров в прежних пределах
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Правок в коде не понадобилось: moveBelt берёт скорость из def каждого здания, стык учитывает хвост целевой ленты.
<!-- SECTION:NOTES:END -->
