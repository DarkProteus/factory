import { buildings } from '@factory/content';
import { isUnlocked } from '@factory/sim';
import { inventoryCells } from '../craftUi';
import {
  acceptsItem,
  buildingPower,
  buildingProgress,
  buildingSections,
  buildingStatus,
  energyLine,
  filterChoices,
  filterCommand,
  putCommand,
  recipeChoices,
  recipeCommand,
  takeCommand,
} from '../buildingUi';
import type { Game } from '../game';
import { Panel } from './BuildPanel';
import { ItemSlot } from './ItemSlot';
import { buildingName, itemName } from './names';
import { RecipeTip } from './RecipeTip';
import { useTick } from './useTick';
import './inventory.css';
import './building.css';

/** Окно здания: слева ячейки инвентаря, справа колонка здания. Рисуется, пока открыто и здание стоит. */
export function BuildingWindow({ game }: { game: Game }) {
  useTick(game);
  const id = game.getOpenBuilding();
  const state = game.getState();
  const b = id === null ? undefined : state.buildings[id];
  const def = b && buildings[b.type as keyof typeof buildings];
  if (!b || !def) return null;

  const { satisfaction, demand } = buildingPower(state, b.id);
  const status = buildingStatus(state, b, satisfaction, demand);
  const progress = buildingProgress(b);
  const energy = energyLine(def, satisfaction);
  const sections = buildingSections(b);
  const choices = def.behavior === 'crafter' && def.recipeMode === 'chosen' ? recipeChoices(game.getInventory(), b, undefined, (id) => isUnlocked(state, id)) : [];
  const filters = filterChoices(b);
  const isChest = def.behavior === 'container';

  return (
    <div className="inventory-window">
      <Panel title={buildingName(b.type)}>
        <div className="inv-columns">
          <div className="inv-grid">
            {inventoryCells(game.getInventory()).map((cell, i) => {
              const cmd = putCommand(b, cell);
              return (
                <ItemSlot
                  key={i}
                  game={game}
                  item={cell?.item ?? null}
                  count={cell?.count}
                  move
                  reject={!!cell && !acceptsItem(b, cell.item)}
                  onClick={cell ? () => cmd && game.command(cmd) : undefined}
                />
              );
            })}
          </div>
          <div className="bw-col">
            {status && (
              <div className="bw-status">
                <i className={`lamp ${status.lamp}`} />
                <span>{status.label}</span>
              </div>
            )}
            {progress !== null && (
              <div className="bw-bar">
                <i style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            {energy && (
              <div className="bw-energy">
                <span className="label">ЭНЕРГИЯ</span>
                <span className={energy.bad ? 'bad' : undefined}>{energy.text}</span>
              </div>
            )}
            {choices.length > 0 && (
              <div>
                <h3>Рецепт</h3>
                <div className="recipe-grid">
                  {choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`btn${c.selected ? ' active' : ''}${c.available ? '' : ' off'}`}
                      aria-disabled={!c.available}
                      onClick={() => {
                        const cmd = recipeCommand(b, c);
                        if (cmd) game.command(cmd);
                      }}
                    >
                      <img src={game.itemIcon(Object.keys(c.def.out)[0]!)} alt={c.id} />
                      <RecipeTip game={game} def={c.def} note={c.available ? undefined : 'Нет места в инвентаре'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sections.map((section, i) => (
              <div key={i}>
                {section.title && <h3>{section.title}</h3>}
                <div className={isChest ? 'bw-chest' : 'bw-cells'}>
                  {section.cells.map((cell, j) => {
                    const cmd = takeCommand(b, cell);
                    return (
                      <ItemSlot
                        key={j}
                        game={game}
                        item={cell.stack?.item ?? null}
                        count={cell.stack?.count}
                        move
                        tip={!cell.stack && cell.wants ? itemName(cell.wants) : undefined}
                        onClick={cmd ? () => game.command(cmd) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            {filters.length > 0 && (
              <div>
                <h3>Фильтр</h3>
                <ItemSlot game={game} item={b.filter ?? null} tip={b.filter ? itemName(b.filter) : 'Без фильтра'} />
                <div className="recipe-grid bw-filter">
                  {filters.map((c) => (
                    <button
                      key={c.item ?? 'none'}
                      type="button"
                      className={`btn${c.selected ? ' active' : ''}`}
                      onClick={() => {
                        const cmd = filterCommand(b, c.item);
                        if (cmd) game.command(cmd);
                      }}
                    >
                      {c.item ? <img src={game.itemIcon(c.item)} alt={itemName(c.item)} /> : <span className="cross" />}
                      <span className="tip">{c.item ? itemName(c.item) : 'Без фильтра'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
