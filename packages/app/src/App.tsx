import { PACKAGE as content } from '@factory/content';
import { PACKAGE as render } from '@factory/render';
import { PACKAGE as save } from '@factory/save';
import { PACKAGE as sim } from '@factory/sim';
import { useEffect, useRef, useState } from 'react';
import { startGame, type Game } from './game';
import { BuildPanel } from './ui/BuildPanel';
import { Hud } from './ui/Hud';
import './ui/fonts';
import './ui/theme.css';
import './ui/ui.css';

export const packages = [sim, content, render, save];

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    let started: Game | null = null;
    void startGame(host.current!).then((g) => {
      if (cancelled) return g.destroy();
      started = g;
      setGame(g);
    });
    return () => {
      cancelled = true;
      started?.destroy();
      setGame(null);
    };
  }, []);

  return (
    <>
      <div ref={host} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }} />
      {game && (
        <div className="hud">
          <Hud game={game} />
          <BuildPanel game={game} />
        </div>
      )}
    </>
  );
}
