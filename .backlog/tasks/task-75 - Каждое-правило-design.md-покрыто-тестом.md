---
id: TASK-75
title: Каждое правило design.md покрыто тестом
status: Done
assignee: []
created_date: '2026-11-21T17:18:00Z'
updated_date: '2026-11-21T19:41:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - sim
modified_files:
  - docs/design.md
  - package.json
  - packages/app/src/buildingUi.test.ts
  - packages/app/src/craftUi.test.ts
  - packages/app/src/input.test.ts
  - packages/app/src/techUi.test.ts
  - packages/app/src/ui/ActionButtons.test.tsx
  - packages/content/src/content.test.ts
  - packages/content/src/m3.test.ts
  - packages/content/src/map.test.ts
  - packages/save/src/index.test.ts
  - packages/save/src/migrate.test.ts
  - packages/sim/src/assembler.test.ts
  - packages/sim/src/bounds.test.ts
  - packages/sim/src/buildcost.test.ts
  - packages/sim/src/craftQueue.test.ts
  - packages/sim/src/filterSplitter.test.ts
  - packages/sim/src/fuel.test.ts
  - packages/sim/src/inserterUnit.test.ts
  - packages/sim/src/lab.test.ts
  - packages/sim/src/milestone2.test.ts
  - packages/sim/src/milestone3.test.ts
  - packages/sim/src/mining.test.ts
  - packages/sim/src/networkUnit.test.ts
  - packages/sim/src/pairs.test.ts
  - packages/sim/src/power.test.ts
  - packages/sim/src/research.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/sim/src/splitter.test.ts
  - packages/sim/src/start.test.ts
  - packages/sim/src/underground.test.ts
  - packages/sim/src/wires.test.ts
  - tools/rule-coverage.mjs
  - tools/rule-coverage.test.ts
type: chore
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ловит пробелы в правилах, а не только ошибки кода. Нужно архитектурное решение (основная сессия): как правило design.md ссылается на тест (метка в тексте, id правила в имени теста и т.п.) и как это проверять — скриптом в tools/ или ревью в конце вехи. Решение записать в задачу. Затем пройти разделы M2 и M3, отметить правила без тестов и завести на них задачи.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Принятое решение о связи правило ↔ тест записано в задаче
- [x] #2 Проверка (скрипт или чек-лист ревью) выводит правила без тестов
- [x] #3 На непокрытые правила M2 и M3 заведены задачи
- [x] #4 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Решение (связь правило ↔ тест):
- Правило — пункт списка или абзац «**Заголовок.** текст» в разделах «## Веха Mx: решения» design.md. В конце его последней строки метка <!-- rule: id -->, id на английском в kebab-case. Правило, которое проверяется только глазами или плейтестом, — <!-- rule: id, manual -->.
- Тест ссылается на правило комментарием // rule: id[, id2] в начале строки над describe/it. Один тест может покрывать несколько правил, одно правило — несколько тестов.
- Проверка: pnpm rules (tools/rule-coverage.mjs) выводит правила без тестов, битые ссылки, повторы id и правила без метки; --strict падает и на непокрытых. tools/rule-coverage.test.ts в pnpm test роняет прогон на битых ссылках, повторах и правилах без метки, но не на непокрытых: непокрытое правило — повод завести задачу, а не красный CI.
- Новое правило в design.md сразу получает метку; задача, реализующая правило, ставит // rule: в свой тест. Ревью в конце вехи: pnpm rules.
- Ссылка говорит, что тест проверяет правило, но не обязательно всё правило целиком. Например, inventory-window, building-window и start-kit покрыты частично.
Итог по M2–M3: 46 правил, 6 ручных, 39 из 40 с тестами. Без теста research-bar, на него заведена TASK-89.
<!-- SECTION:NOTES:END -->
