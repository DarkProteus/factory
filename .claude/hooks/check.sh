#!/usr/bin/env bash
# Хук Stop/SubagentStop: перед завершением работы агента проверяет типы и линтер.
# При ошибке возвращает её текст агенту (exit 2) и не даёт завершиться.
# Повторный вызов в той же остановке (stop_hook_active) не блокирует, чтобы
# не зациклиться на ошибке, которую агент исправить не может; тогда ошибка
# показывается пользователю.
input=$(cat)
# Сабагенты работают в своих worktree: проверяем каталог агента, а не основной.
dir=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
dir=$(git -C "${dir:-${CLAUDE_PROJECT_DIR:-.}}" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$dir" || exit 0
[ -d node_modules ] || exit 0

out=$( { pnpm -s typecheck && pnpm -s lint; } 2>&1 )
[ $? -eq 0 ] && exit 0

out=$(printf '%s\n' "$out" | grep -v '^\s*$' | tail -n 40)
if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then
  jq -n --arg m "Проверка типов/линтера всё ещё падает:
$out" '{systemMessage: $m}'
  exit 0
fi
printf 'pnpm typecheck / pnpm lint не проходят. Исправь до завершения:\n%s\n' "$out" >&2
exit 2
