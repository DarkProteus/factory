import type { ReactNode } from 'react';
import type { Game } from '../game';
import { itemName } from './names';

interface Props {
  game: Game;
  /** Предмет и количество; null — пустая ячейка. */
  item: string | null;
  count?: number;
  /** Прогресс 0..1: полоса 3 px по нижнему краю. */
  progress?: number;
  /** Подсказка при наведении. */
  tip?: ReactNode;
  onClick?: () => void;
}

/** Ячейка предмета: общий элемент окна инвентаря, очереди крафта и окна здания. */
export function ItemSlot({ game, item, count = 1, progress, tip, onClick }: Props) {
  const body = (
    <>
      {item && <img src={game.itemIcon(item)} alt={itemName(item)} draggable={false} />}
      {item && count > 1 && <span className="count">{count}</span>}
      {progress !== undefined && <i className="progress" style={{ width: `${progress * 100}%` }} />}
      {tip && <span className="tip">{tip}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className="slot clickable" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="slot">{body}</div>
  );
}
