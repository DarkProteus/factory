---
id: TASK-43
title: Бенчмарк конвейеров плавает при полном pnpm test
status: Done
assignee: []
created_date: '2026-11-20T22:55:00Z'
updated_date: '2026-11-20T23:11:00Z'
labels:
  - chore
dependencies: []
references:
  - sim
modified_files:
  - package.json
  - packages/sim/src/belt.bench.test.ts
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
belt.bench.test.ts («10000 загруженных клеток укладываются в 8 мс на тик») иногда падает по времени, когда pnpm test гоняет все пакеты параллельно, а отдельно проходит. Вынести бенч из обычного прогона (отдельная команда) или мерить устойчивее (медиана, прогрев).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm test не падает из-за загрузки машины
- [x] #2 Бенчмарк по-прежнему ловит регрессию скорости конвейеров
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: pnpm test и раньше гонял бенч отдельно и последовательно. Падение было, когда основная сессия запускала vitest run целиком, вместе с бенчем. Добавлен скрипт pnpm bench, пачек замера стало 15, метрика — минимум по пачкам. Для проверок запускать pnpm test, а не голый vitest run.
<!-- SECTION:NOTES:END -->
