---
id: TASK-4
title: Тик и команды
status: Done
assignee: []
created_date: '2026-11-16T15:54:00Z'
updated_date: '2026-11-16T17:05:00Z'
labels: []
dependencies:
  - TASK-1
references:
  - sim
documentation:
  - docs/design.md
modified_files:
  - packages/sim/src/tick.test.ts
  - packages/sim/src/determinism.test.ts
  - packages/sim/src/rng.ts
  - packages/sim/src/state.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/tick.ts
  - packages/sim/src/replay.ts
  - packages/sim/src/hash.ts
  - packages/sim/src/index.ts
  - eslint.config.js
  - .groma/systems/factory/containers/browser-game/components/sim.md
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Основа ядра `sim`: интерфейс шлёт команды, ядро обновляет состояние фиксированным шагом 60 тиков в секунду. Вся игра держится на детерминизме: один и тот же список команд всегда даёт одно и то же состояние. На этом построены сохранения (TASK-11), прогон партий скриптом для баланса и хеш-тест в CI. В `sim` запрещены `Math.random` и `Date.now`: только генератор с зерном и счётчик тиков.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Состояние симуляции создаётся из зерна и продвигается функцией тика; счётчик тиков растёт на 1 за шаг
- [x] #2 Команды применяются в заданном тике в порядке поступления
- [x] #3 Одно зерно и один список команд дают одинаковый хеш состояния после 1000 тиков в двух прогонах подряд
- [x] #4 Разные зёрна дают разные хеши (тест задействует генератор случайных чисел)
- [x] #5 В `sim` нет `Math.random` и `Date.now`; это проверяется линтером или тестом
- [x] #6 Тесты идут без браузера и DOM
<!-- AC:END -->
