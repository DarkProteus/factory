import { useEffect, useState } from 'react';
import type { Game } from '../game';

/** Номер тика в левом верхнем углу, без панели. */
export function Hud({ game }: { game: Game }) {
  const [tick, setTick] = useState(game.getTick());
  useEffect(() => {
    const id = setInterval(() => setTick(game.getTick()), 100);
    return () => clearInterval(id);
  }, [game]);
  return <div className="tick">ТИК {tick}</div>;
}
