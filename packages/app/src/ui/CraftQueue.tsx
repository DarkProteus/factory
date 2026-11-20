import { recipes } from '@factory/content';
import { cancelCommand, jobProgress } from '../craftUi';
import type { Game } from '../game';
import { ItemSlot } from './ItemSlot';
import { useTick } from './useTick';
import './inventory.css';

/** Очередь ручного крафта над панелью стройки: видна, пока не пуста; клик отменяет запись. */
export function CraftQueue({ game }: { game: Game }) {
  useTick(game);
  const queue = game.getCraftQueue();
  if (queue.length === 0) return null;
  return (
    <div className="craft-queue">
      {queue.map((job, i) => {
        const out = Object.entries(recipes[job.recipe as keyof typeof recipes]?.out ?? {})[0];
        return (
          <ItemSlot
            key={i}
            game={game}
            item={out?.[0] ?? null}
            count={out?.[1]}
            progress={i === 0 ? jobProgress(job) : undefined}
            tip="Отменить"
            onClick={() => game.command(cancelCommand(i))}
          />
        );
      })}
    </div>
  );
}
