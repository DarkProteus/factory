---
id: TASK-60
title: Линтер границ sim падает по таймауту под нагрузкой
status: Done
assignee: []
created_date: '2026-11-21T12:45:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies: []
references:
  - sim
modified_files:
  - tools/boundaries.test.ts
type: chore
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
tools/boundaries.test.ts «настоящий код sim проходит линтер» идёт 5–10 с при нагрузке (параллельные worktree), лимит Vitest 5 с — ложные падения pnpm test. Поднять таймаут этого теста до 30 с.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Тест линтера sim имеет таймаут 30 с
- [x] #2 pnpm test зелёный
<!-- AC:END -->
