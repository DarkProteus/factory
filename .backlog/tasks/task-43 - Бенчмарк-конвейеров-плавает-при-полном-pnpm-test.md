---
id: TASK-43
title: Бенчмарк конвейеров плавает при полном pnpm test
status: To Do
assignee: []
created_date: '2026-11-20T22:55:00Z'
labels:
  - chore
dependencies: []
references:
  - sim
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
belt.bench.test.ts («10000 загруженных клеток укладываются в 8 мс на тик») иногда падает по времени, когда pnpm test гоняет все пакеты параллельно, а отдельно проходит. Вынести бенч из обычного прогона (отдельная команда) или мерить устойчивее (медиана, прогрев).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm test не падает из-за загрузки машины
- [ ] #2 Бенчмарк по-прежнему ловит регрессию скорости конвейеров
<!-- AC:END -->
