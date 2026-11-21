---
id: TASK-82
title: 'Мутанты: крафт, топливо, лаборатория, исследования'
status: In Progress
assignee: []
created_date: '2026-11-21T17:54:00Z'
updated_date: '2026-11-21T19:04:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
modified_files:
  - packages/sim/src/fuelEdge.test.ts
  - packages/sim/src/crafterEdge.test.ts
  - packages/sim/src/labEdge.test.ts
  - packages/sim/src/researchEdge.test.ts
  - packages/sim/src/assembler.test.ts
  - packages/sim/src/craftQueue.test.ts
priority: medium
type: chore
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: fuel.ts (17/1 — проверка вида топлива и стопки), crafter.ts (16/1 — проверка ингредиента рецепта), lab.ts (12/3 — ветка создания b.input не покрыта), research.ts (6/1 — выбор активной технологии), assembler.ts (3 — защита setRecipe), craftQueue.ts (6 — count <= 0, .some против .every в проверке материалов).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Выжившие в fuel.ts, crafter.ts, lab.ts, research.ts, assembler.ts, craftQueue.ts убиты или помечены эквивалентными
- [x] #2 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Процент убитых (Killed+Timeout) по своим файлам, до -> после: fuel.ts 83.7 -> 98.9, crafter.ts 89.2 -> 96.4, lab.ts 84.6 -> 97.1, research.ts 90.8 -> 98.5, assembler.ts 92.1 -> 100, craftQueue.ts 92.3 -> 97.4. Всего по шести файлам: 479/543 (88.2%) -> 530/543 (97.6%). Тесты: fuelEdge, crafterEdge, labEdge, researchEdge (новые), дополнены assembler.test.ts и craftQueue.test.ts; код модулей не менялся.

Оставшиеся эквивалентные мутанты (13, убивать нечем):
- fuel.ts L21 defs[item]?.stack: ветка достижима, только когда isFuel(item) уже true, то есть defs[item] определён; ?. никогда не срабатывает.
- crafter.ts L23 (b.recipe !== undefined -> true): при b.recipe undefined recipes[undefined] даёт undefined, результат тот же.
- crafter.ts L42 (limit = '' вместо 'buffer'): сравнивается только limit === 'stack', значения 'buffer' и '' ведут себя одинаково.
- crafter.ts L48 (id === undefined -> false): при id undefined recipes[undefined]?.in даёт {}, и item in {} ложно: тот же return false.
- crafter.ts L62 x2 (recipeMode === 'chosen' -> false или ''): crafterAccept вызывается только после crafterCanAccept, предмет есть во входе b.recipe, и recipeFor в этом случае возвращает ровно b.recipe.
- crafter.ts L88 (b.recipe === undefined -> false): recipes[undefined] тоже undefined.
- lab.ts L33 (id !== undefined -> true): Object.hasOwn(technologies, undefined) ложно, результат тот же.
- lab.ts L45 (limit = '' вместо 'buffer'): как в crafter.ts L42.
- lab.ts L48 itemDefs[item]?.stack: item взят из unit технологии, всегда есть в items.
- research.ts L50 (r.active === null -> false): r.progress[null] даёт undefined, как и ветка undefined.
- craftQueue.ts L35 x2 (count <= 0 -> false и count < 0): при count <= 0 дальше removeItems(..., n*count) ничего не делает (left > 0), цикл for i < count не добавляет записей: проверка вырождена, наблюдаемого эффекта нет.
<!-- SECTION:NOTES:END -->
