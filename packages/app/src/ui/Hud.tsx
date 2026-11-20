import { useEffect, useState } from 'react';
import type { Game } from '../game';

/** Левый верхний угол без панели: номер тика, «Новая партия», сообщение об ошибке сохранения. */
export function Hud({ game }: { game: Game }) {
  const [tick, setTick] = useState(game.getTick());
  const [message, setMessage] = useState(game.getMessage());
  useEffect(() => {
    const id = setInterval(() => setTick(game.getTick()), 100);
    const off = game.subscribe(() => setMessage(game.getMessage()));
    return () => {
      clearInterval(id);
      off();
    };
  }, [game]);
  const newGame = () => {
    if (window.confirm('Начать новую партию? Текущая будет удалена.')) game.newGame();
  };
  return (
    <div className="corner">
      <div className="tick">ТИК {tick}</div>
      <button type="button" className="link-button" onClick={newGame}>
        Новая партия
      </button>
      {message && <div className="save-error">{message}</div>}
    </div>
  );
}
