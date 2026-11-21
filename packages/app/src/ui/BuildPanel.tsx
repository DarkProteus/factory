import { buildings } from "@factory/content";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Game } from "../game";
import { visibleBuildingIds } from "../input";
import { ToolsPanel, WindowsPanel } from "./ActionButtons";
import { buildingName } from "./names";

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="panel">
      {["tl", "tr", "bl", "br"].map((c) => (
        <i key={c} className={`rivet ${c}`} />
      ))}
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

/** Панель зданий снизу по центру, справа от неё панели инструментов и окон. */
export function BuildPanel({ game }: { game: Game }) {
  const { tool } = useSyncExternalStore(game.subscribe, game.getTools);
  // Число предметов меняется на тиках, а не по действиям игрока: перечитываем по таймеру.
  const [, refresh] = useState(0);
  useEffect(() => {
    const id = setInterval(() => refresh((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dock">
      <Panel title="Строительство">
        <div className="row">
          {visibleBuildingIds(game.getState()).map((id, i) => {
            const def = buildings[id as keyof typeof buildings];
            const active = tool.kind === "build" && tool.building === id;
            const count = game.itemCount(id);
            return (
              <button
                key={id}
                className={`btn${active ? " active" : ""}`}
                disabled={count <= 0}
                onClick={() => game.chooseBuilding(id)}
              >
                <img src={game.icon(id)} alt={buildingName(id)} />
                <span className="count">{count}</span>
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
      <ToolsPanel game={game} />
      <WindowsPanel game={game} />
    </div>
  );
}
