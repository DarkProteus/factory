import { PACKAGE as content } from '@factory/content';
import { PACKAGE as render } from '@factory/render';
import { PACKAGE as save } from '@factory/save';
import { PACKAGE as sim } from '@factory/sim';
import { useEffect, useRef, useState } from 'react';
import { startGame, type Game } from './game';
import { BuildPanel } from './ui/BuildPanel';
import { CraftQueue } from './ui/CraftQueue';
import { Hud } from './ui/Hud';
import { InventoryWindow } from './ui/InventoryWindow';
import { NetSummaryTip } from './ui/NetSummaryTip';
import './ui/fonts';
import './ui/theme.css';
import './ui/ui.css';

export const packages = [sim, content, render, save];

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let started: Game | null = null;
    void startGame(host.current!, abort.signal).then((g) => {
      if (!g) return;
      if (abort.signal.aborted) return g.destroy();
      started = g;
      setGame(g);
    });
    return () => {
      abort.abort();
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
          <div className="dock-stack">
            <CraftQueue game={game} />
            <BuildPanel game={game} />
          </div>
          <InventoryWindow game={game} />
          <NetSummaryTip game={game} />
        </div>
      )}
    </>
  );
}
