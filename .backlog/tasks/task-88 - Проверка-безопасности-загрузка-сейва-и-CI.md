---
id: TASK-88
title: 'Проверка безопасности: загрузка сейва и CI'
status: To Do
assignee: []
created_date: '2026-11-21T19:26:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - save
priority: low
type: chore
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Для плагина claude-bughunter (после перезапуска Claude Code). Поверхность атаки игры — только недоверенный ввод сейва (localStorage, импорт) и GitHub Actions.

1) Сейв: поддельный JSON не ломает игру и не загрязняет прототипы (ключи __proto__, constructor, prototype в buildings, progress, inventory); огромные массивы и глубокая вложенность не вешают проверку (packages/save/src/validate.ts); ошибка показывается игроку, а приложение не падает.

2) CI (.github/workflows/ci.yml, deploy.yml): минимальные права GITHUB_TOKEN (permissions), версии сторонних actions, нет ли исполнения недоверенного ввода (pull_request_target, подстановка полей github.event в шаги run).

Найденное — отдельными задачами; чинить в рамках этой задачи не нужно.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Отчёт по сейву: проверены прототипные ключи, размер, вложенность; найденное — задачами
- [ ] #2 Отчёт по CI: права, версии actions, инъекции; найденное — задачами
<!-- AC:END -->
