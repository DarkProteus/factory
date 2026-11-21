import { useSyncExternalStore } from 'react';
import type { Game } from '../game';
import type { ToolState } from '../input';
import { Panel } from './BuildPanel';
import { MineButton } from './MineButton';

/** Кнопка поворота (R): доступна, только пока выбрано здание для стройки. Логика та же, что у клавиши. */
export function rotateButton(game: Game, { tool }: ToolState) {
  return (
    <button className="btn btn-gap" disabled={tool.kind !== 'build'} onClick={() => game.rotate()}>
      <svg className="line-icon" viewBox="0 0 24 24" aria-label="Поворот">
        <path d="M12 4 A8 8 0 1 1 4 12" />
        <path className="arrow" d="M1 14 L4 10 L7 14" />
      </svg>
      <span className="key">R</span>
      <span className="tip">
        <b>Поворот</b>
      </span>
    </button>
  );
}

/** Кнопка «Снять инструмент» (Esc): доступна, только пока инструмент выбран. */
export function clearToolButton(game: Game, { tool }: ToolState) {
  return (
    <button className="btn" disabled={tool.kind === 'none'} onClick={() => game.clearTool()}>
      <svg className="line-icon" viewBox="0 0 24 24" aria-label="Снять инструмент">
        <path d="M6 3 L6 19 L10 15 L13 21 L15.5 20 L12.5 14 L18 14 Z" />
      </svg>
      <span className="key">ESC</span>
      <span className="tip">
        <b>Снять инструмент</b>
      </span>
    </button>
  );
}

/** Кнопка инвентаря (E): выбрана, пока окно открыто; повторный клик закрывает его. */
export function inventoryButton(game: Game, open: boolean) {
  return (
    <button className={`btn${open ? ' active' : ''}`} onClick={() => game.setInventoryOpen(!open)}>
      <svg className="line-icon" viewBox="0 0 24 24" aria-label="Инвентарь">
        <rect x="2" y="2" width="9" height="9" />
        <rect x="13" y="2" width="9" height="9" />
        <rect x="2" y="13" width="9" height="9" />
        <rect x="13" y="13" width="9" height="9" />
      </svg>
      <span className="key">E</span>
      <span className="tip">
        <b>Инвентарь</b>
      </span>
    </button>
  );
}

/** Панель инструментов: Снос (X), Кирка (M), затем действия над ними — Поворот (R), Снять (Esc). */
export function ToolsPanel({ game }: { game: Game }) {
  const tools = useSyncExternalStore(game.subscribe, game.getTools, game.getTools);
  return (
    <Panel>
      <div className="row">
        <button
          className={`btn${tools.tool.kind === 'demolish' ? ' active' : ''}`}
          onClick={() => game.chooseDemolish()}
        >
          <span className="cross" />
          <span className="key">X</span>
          <span className="tip">
            <b>Снос</b>
          </span>
        </button>
        <MineButton game={game} />
        {rotateButton(game, tools)}
        {clearToolButton(game, tools)}
      </div>
    </Panel>
  );
}

/** Панель окон: Инвентарь (E); сюда же встанут Исследования (T). */
export function WindowsPanel({ game }: { game: Game }) {
  const open = useSyncExternalStore(game.subscribe, game.isInventoryOpen, game.isInventoryOpen);
  return (
    <Panel>
      <div className="row">{inventoryButton(game, open)}</div>
    </Panel>
  );
}
