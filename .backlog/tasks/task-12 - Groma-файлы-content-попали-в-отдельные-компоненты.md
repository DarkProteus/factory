---
id: TASK-12
title: 'Groma: файлы content попали в отдельные компоненты'
status: Done
assignee: []
created_date: '2026-11-16T16:48:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels: []
milestone: m-1
dependencies: []
references:
  - content
modified_files:
  - .groma/systems/factory/containers/browser-game/components/content.md
  - .groma/systems/factory/containers/browser-game/components/items.md
  - .groma/systems/factory/containers/browser-game/components/recipes.md
  - .groma/systems/factory/containers/browser-game/components/buildings.md
  - .groma/systems/factory/containers/browser-game/components/types.md
type: chore
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
После TASK-3 groma сама создала в .groma/systems/factory/containers/browser-game/components/ компоненты items, recipes, buildings, types для файлов packages/content/src/*.ts. По смыслу C4 это код компонента content, а не отдельные компоненты. Разобраться через groma agent-instructions structure и закурировать через CLI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Файлы packages/content/src/{items,recipes,buildings,types}.ts принадлежат компоненту content (groma view показывает content)
- [x] #2 Лишних компонентов items, recipes, buildings, types на карте нет
<!-- AC:END -->
