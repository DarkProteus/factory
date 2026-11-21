---
id: TASK-48
title: Состояние исследований и команда выбора технологии
status: To Do
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T12:13:00Z'
labels:
  - m3
dependencies:
  - TASK-47
references:
  - sim
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
- [ ] #1 setResearch принимает только доступную неизученную технологию; прогресс прочих сохраняется при переключении
- [ ] #2 Закрытый рецепт нельзя поставить в очередь крафта и выбрать в сборщике; предмет закрытого здания ставится
- [ ] #3 Завершение технологии открывает её unlocks и сбрасывает activeTech; состояние в хеше
- [ ] #4 pnpm test зелёный
- [ ] #5 Печь выбирает рецепт только среди открытых: до изучения steel железная пластина в печь не принимается (сейчас pickRecipe в crafter.ts берёт steelPlate по ironPlate во входе)
<!-- AC:END -->
