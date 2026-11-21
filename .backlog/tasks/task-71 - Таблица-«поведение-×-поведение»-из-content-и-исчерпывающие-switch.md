---
id: TASK-71
title: Таблица «поведение × поведение» из content и исчерпывающие switch
status: To Do
assignee: []
created_date: '2026-11-21T17:17:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-70
references:
  - sim
  - content
priority: high
type: chore
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Закрепить итог аудита TASK-70 тестом. Тест сам перебирает все пары зданий из content (источник × цель) и для каждой сверяет реальное поведение манипулятора (takeFrom/canAccept) и ленты с таблицей ожиданий «можно / нельзя». Пара без строки в таблице — падение теста: новое здание нельзя добавить, не решив, как оно сочетается с остальными. Плюс: в switch по behavior в sim включить проверку never там, где TASK-70 сочтёт это оправданным.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Тест строит пары из content, а не из списка в коде теста
- [ ] #2 Новое здание без строки в таблице роняет тест (проверено временным зданием в тесте)
- [ ] #3 Таблица совпадает с design.md; расхождения — отдельные задачи
- [ ] #4 switch по behavior, отмеченные в TASK-70, исчерпывающие через never
- [ ] #5 pnpm test зелёный
<!-- AC:END -->
