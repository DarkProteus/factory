---
id: TASK-19
title: 'Хук: проверка типов и линтер по окончании работы агента'
status: Done
assignee: []
created_date: '2026-11-20T16:35:00Z'
updated_date: '2026-11-20T16:38:00Z'
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
- [x] #1 В .claude/settings.json есть хук Stop, который запускает pnpm typecheck и pnpm lint
- [x] #2 При ошибке типов агент получает её текст и не может завершить работу, пока не исправит
- [x] #3 При зелёных проверках хук молчит
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Скрипт .claude/hooks/check.sh, хуки Stop и SubagentStop. Каталог берётся из поля cwd входа хука (сабагенты в worktree проверяют свой каталог). Защита от зацикливания: при stop_hook_active хук не блокирует, а показывает ошибку пользователю.
<!-- SECTION:NOTES:END -->
