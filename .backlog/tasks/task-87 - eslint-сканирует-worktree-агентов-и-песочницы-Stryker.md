---
id: TASK-87
title: eslint сканирует worktree агентов и песочницы Stryker
status: Done
assignee: []
created_date: '2026-11-21T18:59:00Z'
updated_date: '2026-11-21T19:37:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - eslint.config.js
priority: medium
type: bug
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pnpm lint (eslint .) падает с ENOENT на .claude/worktrees/*/.stryker-tmp/…: в ignores eslint.config.js только node_modules и dist. Добавить в ignores .claude/**, .stryker-tmp/**, .stryker-cache/**, reports/**, .playwright-mcp/** (и каталоги отчётов Playwright после TASK-76).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm lint не заходит в .claude/, .stryker-tmp/, reports/ (проверено при живом worktree со Stryker)
- [x] #2 pnpm lint и pnpm test зелёные
<!-- AC:END -->
