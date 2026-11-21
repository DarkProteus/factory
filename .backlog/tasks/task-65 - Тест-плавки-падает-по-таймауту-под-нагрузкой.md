---
id: TASK-65
title: Тест плавки падает по таймауту под нагрузкой
status: Done
assignee: []
created_date: '2026-11-21T13:08:00Z'
updated_date: '2026-11-21T14:39:00Z'
labels:
  - m3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/fuel.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/sim/src/invariants.test.ts
  - packages/render/src/scene.test.ts
  - tools/boundaries.test.ts
  - tools/pages-base.test.ts
type: bug
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/sim/src/smelting.test.ts «100 руды по конвейеру превращаются ровно в 100 пластин» падает по таймауту 5 с, когда параллельно работают агенты (load average > 20); отдельно проходит. Как в TASK-60: дать долгому тесту явный таймаут (30 с) и проверить другие долгие тесты sim.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Долгие тесты sim имеют явный таймаут
- [x] #2 pnpm test зелёный под нагрузкой
<!-- AC:END -->
