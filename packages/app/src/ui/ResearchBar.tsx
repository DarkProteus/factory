import { technologies } from '@factory/content';
import type { Game } from '../game';
import { researchBar, techIcon } from '../techUi';
import { Panel } from './BuildPanel';
import { itemName } from './names';
import { useTick } from './useTick';
import './research.css';

/** Уведомление «Изучено: …» под полоской: панель с лентой, иконка 24 px; прозрачность падает в последние 0,5 с. */
function ResearchNotice({ game }: { game: Game }) {
  const notice = game.getNotice();
  if (!notice) return null;
  const tech = technologies[notice.tech as keyof typeof technologies];
  const icon = techIcon(notice.tech);
  return (
    <div className="research-notice" style={{ opacity: notice.alpha }}>
      <Panel>
        <div className="rn-row">
          {icon && <img src={game.itemIcon(icon)} alt="" />}
          <span>Изучено: {tech?.name ?? itemName(notice.tech)}</span>
        </div>
      </Panel>
    </div>
  );
}

/** Сверху по центру: полоска исследования (всегда, пока есть что изучать) и под ней уведомление. */
export function ResearchBar({ game }: { game: Game }) {
  useTick(game);
  const bar = researchBar(game.getState());
  const icon = bar.kind === 'active' ? techIcon(bar.id) : null;
  return (
    <div className="top-center">
      {bar.kind === 'active' && (
        <div className="research-bar">
          <div className="rb-row">
            {icon && <img src={game.itemIcon(icon, 16)} alt="" />}
            <span className="rb-name">{bar.name}</span>
            <span className="rb-count">
              {bar.units} / {bar.total}
            </span>
          </div>
          <div className="rb-track">
            <i style={{ width: `${bar.fraction * 100}%` }} />
          </div>
        </div>
      )}
      {bar.kind === 'idle' && (
        <button type="button" className="research-bar idle" onClick={() => game.setResearchOpen(true)}>
          Выберите исследование (T)
        </button>
      )}
      <ResearchNotice game={game} />
    </div>
  );
}
