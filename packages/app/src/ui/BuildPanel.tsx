import { buildings } from '@factory/content';
import { useSyncExternalStore, type ReactNode } from 'react';
import type { Game } from '../game';
import { buildingIds } from '../input';
import { buildingName } from './names';

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="panel">
      {['tl', 'tr', 'bl', 'br'].map((c) => (
        <i key={c} className={`rivet ${c}`} />
      ))}
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

/** Панель зданий снизу по центру и кнопка сноса справа от неё. */
export function BuildPanel({ game }: { game: Game }) {
  const { tool } = useSyncExternalStore(game.subscribe, game.getTools);
  return (
    <div className="dock">
      <Panel title="Строительство">
        <div className="row">
          {buildingIds().map((id, i) => {
            const def = buildings[id as keyof typeof buildings];
            const active = tool.kind === 'build' && tool.building === id;
            return (
              <button key={id} className={`btn${active ? ' active' : ''}`} onClick={() => game.chooseBuilding(id)}>
                <img src={game.icon(id)} alt={buildingName(id)} />
                {i < 9 && <span className="key">{i + 1}</span>}
                <span className="tip">
                  <b>{buildingName(id)}</b>
                  <span>
                    {def.size[0]}×{def.size[1]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <button className={`btn${tool.kind === 'demolish' ? ' active' : ''}`} onClick={() => game.chooseDemolish()}>
          <span className="cross" />
          <span className="key">X</span>
          <span className="tip">
            <b>Снос</b>
          </span>
        </button>
      </Panel>
    </div>
  );
}
