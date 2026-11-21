---
id: TASK-72
title: Мутационное тестирование sim на Stryker
status: In Progress
assignee: []
created_date: '2026-11-21T17:17:00Z'
updated_date: '2026-11-21T17:22:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
priority: high
type: chore
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Поставить Stryker (раннер vitest) для packages/sim, команда pnpm mutate. В pnpm test не входит: прогон долгий. Режим по изменённым файлам (incremental) для работы, полный прогон — в конце вехи. Снять исходный процент убитых мутантов и записать его в задачу и в design.md (раздел про тесты). Выживших мутантов разобрать по файлам и завести задачи на недостающие тесты, не дописывая их в этой задаче.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm mutate запускает Stryker по sim, отчёт HTML в каталоге вне git
- [ ] #2 Есть инкрементальный режим, повторный прогон без изменений быстрее полного
- [ ] #3 Исходный процент убитых мутантов записан в задаче и в design.md
- [ ] #4 На выживших мутантов заведены задачи по файлам, со ссылками
- [ ] #5 pnpm test зелёный и не запускает Stryker
<!-- AC:END -->
