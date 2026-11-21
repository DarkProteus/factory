---
id: TASK-48
title: Состояние исследований и команда выбора технологии
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies:
  - TASK-47
references:
  - sim
modified_files:
  - packages/sim/src/research.ts
  - packages/sim/src/research.test.ts
  - packages/sim/src/state.ts
  - packages/sim/src/tick.ts
  - packages/sim/src/commands.ts
  - packages/sim/src/index.ts
  - packages/sim/src/assembler.ts
  - packages/sim/src/craftQueue.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/inserter.ts
  - packages/sim/src/manual.ts
  - packages/sim/src/miner.ts
priority: high
type: feature
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
В SimState: activeTech, прогресс по технологиям (единицы и тики текущей единицы), множество открытых рецептов из content.startRecipes. Входит в хеш. Команда setResearch(tech): только если все requires изучены и сама не изучена. Ручной крафт и выбор рецепта сборщика отклоняют закрытые рецепты. Постройка из инвентаря не проверяет открытость (design.md M3). По завершении технологии рецепты из unlocks открываются, activeTech сбрасывается, в state кладётся событие для интерфейса.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 setResearch принимает только доступную неизученную технологию; прогресс прочих сохраняется при переключении
- [x] #2 Закрытый рецепт нельзя поставить в очередь крафта и выбрать в сборщике; предмет закрытого здания ставится
- [x] #3 Завершение технологии открывает её unlocks и сбрасывает activeTech; состояние в хеше
- [x] #4 pnpm test зелёный
- [x] #5 Печь выбирает рецепт только среди открытых: до изучения steel железная пластина в печь не принимается (сейчас pickRecipe в crafter.ts берёт steelPlate по ironPlate во входе)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
События интерфейса — state.events (очищается в начале тика), сейчас один вид researchDone. canAccept/accept принимают unlocked необязательно: без него открыто всё (для юнит-тестов), в игре передаётся всегда. Сейв не тронут: старый сейв без research упадёт — TASK-51 обязательна до публикации.
<!-- SECTION:NOTES:END -->
