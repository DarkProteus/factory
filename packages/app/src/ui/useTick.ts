import { useEffect, useState } from 'react';
import type { Game } from '../game';

/** Перерисовывает компонент каждые ms миллисекунд и при уведомлениях игры; возвращает номер тика. */
export function useTick(game: Game, ms = 50): number {
  const [tick, setTick] = useState(game.getTick());
  useEffect(() => {
    const refresh = () => setTick(game.getTick());
    const id = setInterval(refresh, ms);
    const off = game.subscribe(refresh);
    return () => {
      clearInterval(id);
      off();
    };
  }, [game, ms]);
  return tick;
}
