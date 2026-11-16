---
id: TASK-6
title: Бур
status: To Do
assignee: []
created_date: '2026-11-16T15:55:00Z'
updated_date: '2026-11-16T16:58:00Z'
labels: []
dependencies:
  - TASK-5
references:
  - sim
  - content
documentation:
  - docs/design.md
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Система «Добыча» и первое поведение `miner`: бур стоит на залежи и выдаёт руду. Это начало цепочки «руда сама превращается в пластины». Скорость добычи — число из `content`, а не константа в ядре.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Здание бура описано в `content` с `behavior: miner` и числом тиков на единицу руды
- [ ] #2 Бур на залежи выдаёт одну руду за заданное число тиков (проверено на нескольких циклах подряд)
- [ ] #3 Тип руды соответствует залежи под буром
- [ ] #4 Бур на клетке без залежи не выдаёт ничего
- [ ] #5 Когда выходной буфер бура заполнен, добыча останавливается и руда не теряется
<!-- AC:END -->
