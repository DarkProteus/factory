---
id: TASK-3
title: Определения контента
status: Done
assignee: []
created_date: '2026-11-16T15:54:00Z'
updated_date: '2026-11-16T16:48:00Z'
labels: []
dependencies:
  - TASK-1
references:
  - content
documentation:
  - docs/design.md
modified_files:
  - packages/content/src/content.test.ts
  - packages/content/src/types.ts
  - packages/content/src/items.ts
  - packages/content/src/recipes.ts
  - packages/content/src/buildings.ts
  - packages/content/src/index.ts
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Весь контент игры — типизированные таблицы в пакете `content`, без логики: новый предмет или рецепт добавляется записью, а не кодом. Ядру и остальным задачам нужны типы и минимальный набор данных. Ссылки между таблицами (рецепт → предмет, рецепт → здание) ничем не защищены, кроме теста-валидатора. Образец формата таблиц — раздел «Контент как данные» дизайн-дока.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 В `content` экспортируются типы `ItemDef`, `RecipeDef`, `BuildingDef`
- [x] #2 В таблицах есть три предмета и один рецепт, проверенные через `satisfies`
- [x] #3 Тест-валидатор проходит на настоящем контенте
- [x] #4 Тест-валидатор ловит рецепт со ссылкой на несуществующий предмет (вход или выход)
- [x] #5 Тест-валидатор ловит рецепт с `madeIn`, указывающим на несуществующее здание
- [x] #6 В `content` нет логики и импортов из других пакетов
<!-- AC:END -->
