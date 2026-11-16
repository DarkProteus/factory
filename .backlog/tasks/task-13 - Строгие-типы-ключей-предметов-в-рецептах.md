---
id: TASK-13
title: Строгие типы ключей предметов в рецептах
status: To Do
assignee: []
created_date: '2026-11-16T16:51:00Z'
updated_date: '2026-11-16T16:58:00Z'
labels: []
dependencies:
  - TASK-3
references:
  - content
type: chore
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейчас RecipeDef.in/out — Record<string, number>, а madeIn — string, поэтому опечатку в id предмета или здания ловит только тест-валидатор (TASK-3). Нужно, чтобы её ловил компилятор: ключи in/out ограничены id из таблицы items, madeIn — id из buildings, ammo — id из items. В content по-прежнему только данные и типы.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Рецепт с несуществующим id предмета в in или out не компилируется (проверка через @ts-expect-error в тесте)
- [ ] #2 Рецепт с madeIn на несуществующее здание не компилируется
- [ ] #3 Настоящий контент компилируется без изменений в записях таблиц
- [ ] #4 pnpm test, pnpm build и pnpm lint проходят
<!-- AC:END -->
