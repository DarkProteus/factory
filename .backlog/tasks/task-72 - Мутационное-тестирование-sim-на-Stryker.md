---
id: TASK-72
title: Мутационное тестирование sim на Stryker
status: Done
assignee: []
created_date: '2026-11-21T17:17:00Z'
updated_date: '2026-11-21T17:55:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - package.json
  - pnpm-lock.yaml
  - .gitignore
  - stryker.config.json
  - vitest.stryker.config.ts
  - docs/design.md
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
- [x] #1 pnpm mutate запускает Stryker по sim, отчёт HTML в каталоге вне git
- [x] #2 Есть инкрементальный режим, повторный прогон без изменений быстрее полного
- [x] #3 Исходный процент убитых мутантов записан в задаче и в design.md
- [x] #4 На выживших мутантов заведены задачи по файлам, со ссылками
- [x] #5 pnpm test зелёный и не запускает Stryker
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Stryker 10.1 (vitest-runner, perTest, incremental). pnpm mutate; отчёт reports/mutation/. Из прогона исключены бенч и milestone2/milestone3/smelting (4–13 с на тест, иначе часы). Полный прогон 1133 с (2303 мутанта), повторный без изменений 37–57 с. Mutation score 87,5% (1771/2023 без фикстуры milestone3.layout.ts): убито 1744, таймаут 27, выжило 232, без покрытия 20. Прогон шёл на базе 5ce11d4 (до TASK-69/71/77/78). Выжившие разложены по задачам TASK-81–85. Компонент groma для vitest.stryker.config.ts влит в sim.
<!-- SECTION:NOTES:END -->
