---
id: TASK-78
title: Манипулятор перекладывает пакеты из лаборатории в лабораторию
status: To Do
assignee: []
created_date: '2026-11-21T17:24:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
priority: low
type: feature
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Найдено аудитом TASK-70: takeFrom (transfer.ts) не берёт из лаборатории, поэтому лаборатории нельзя ставить цепочкой, как в Factorio. Решение основной сессии: манипулятор берёт из лаборатории пакет, который примет цель (для цели-лаборатории — пакеты активной технологии до её лимита запаса). Пакеты идущей единицы (b.unit) не трогаются. Дописать правило в design.md (раздел M3, лаборатория).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Цепочка лаборатория → манипулятор → лаборатория: вторая получает пакеты (тест)
- [ ] #2 Пакеты идущей единицы манипулятор не забирает
- [ ] #3 Правило в design.md
- [ ] #4 pnpm test зелёный
<!-- AC:END -->
