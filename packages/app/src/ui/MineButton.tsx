import { useSyncExternalStore } from 'react';
import type { Game } from '../game';

/** Кнопка инструмента «кирка» (клавиша M): ручная добыча зажатой кнопкой на залежи. */
export function MineButton({ game }: { game: Game }) {
  const { tool } = useSyncExternalStore(game.subscribe, game.getTools, game.getTools);
  return (
    <button className={`btn${tool.kind === 'mine' ? ' active' : ''}`} onClick={() => game.chooseMine()}>
      <svg className="pickaxe" viewBox="0 0 24 24" aria-label="Кирка">
        <path className="handle" d="M5 21 L16 10" />
        <path className="head" d="M4 10 Q12 2 20 10" />
      </svg>
      <span className="key">M</span>
      <span className="tip">
        <b>Кирка</b>
      </span>
    </button>
  );
}
