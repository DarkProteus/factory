---
id: TASK-19
title: 'Хук: проверка типов и линтер по окончании работы агента'
status: To Do
assignee: []
created_date: '2026-11-20T16:35:00Z'
labels: []
dependencies: []
references:
  - browser-game
type: chore
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ошибки типов сейчас видны только на pnpm build: vitest типы не проверяет (так TASK-13 после переноса на main сломала crafter.ts при зелёных тестах). Хук Claude Code на событие Stop запускает pnpm typecheck и pnpm lint и возвращает ошибки агенту. На каждое изменение файла не вешать: полный tsc идёт несколько секунд.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 В .claude/settings.json есть хук Stop, который запускает pnpm typecheck и pnpm lint
- [ ] #2 При ошибке типов агент получает её текст и не может завершить работу, пока не исправит
- [ ] #3 При зелёных проверках хук молчит
<!-- AC:END -->
