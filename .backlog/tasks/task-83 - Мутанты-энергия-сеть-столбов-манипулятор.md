---
id: TASK-83
title: 'Мутанты: энергия, сеть столбов, манипулятор'
status: In Progress
assignee: []
created_date: '2026-11-21T17:55:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
priority: medium
type: chore
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: power.ts (16/5 — порядок сетей, учёт draw), network.ts (13 — union-find ra < rb, зона покрытия столба), inserter.ts (13 — электрический и неэлектрический манипулятор не различаются тестами).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Выжившие в power.ts, network.ts, inserter.ts убиты или помечены эквивалентными
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
