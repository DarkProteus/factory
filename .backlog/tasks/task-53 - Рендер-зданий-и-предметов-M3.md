---
id: TASK-53
title: Рендер зданий и предметов M3
status: Done
assignee: []
created_date: '2026-11-21T12:01:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies:
  - TASK-47
  - TASK-52
references:
  - render
type: feature
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Отрисовать по style.md: лаборатория со свечением колбы во время исследования, подземный вход и выход, призрак выхода с парой или «нет пары», быстрые версии, фильтрующий разделитель, иконки новых предметов.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Все здания и предметы M3 рисуются по style.md
- [x] #2 Скриншот проверен
- [x] #3 Призрак подземного показывает будущую пару или подпись «вход»; предметы в тоннеле не рисуются
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Проверено в игре на сейве с работающей лабораторией (main после TASK-49/59): свечение, ячейка пакета, лампы, окно лаборатории. Портал во всю клетку (32 px) — style-m3.md уточнён. Подсветка следующего выхода обычного разделителя (splitterNext) по-прежнему заглушка — отдельная задача.
<!-- SECTION:NOTES:END -->
